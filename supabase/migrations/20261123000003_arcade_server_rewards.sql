-- Server-authoritative arcade wallet and atomic reward redemption.
-- Clients can still change presentation fields, but cannot write EXP/Gems directly.

begin;

create table if not exists public.arcade_reward_events (
  school_id text not null,
  user_id text not null,
  event_id text not null,
  event_day date not null default (now() at time zone 'Asia/Bangkok')::date,
  exp_delta integer not null,
  gems_delta integer not null,
  created_at timestamptz not null default now(),
  primary key (school_id, user_id, event_id)
);

create table if not exists public.arcade_reward_purchases (
  id text primary key,
  school_id text not null,
  user_id text not null,
  item_id text not null,
  cost_gems integer not null,
  created_at timestamptz not null default now()
);

alter table public.arcade_reward_events enable row level security;
alter table public.arcade_reward_purchases enable row level security;
revoke all on public.arcade_reward_events, public.arcade_reward_purchases from public, anon, authenticated;
grant select, insert, update, delete on public.arcade_reward_events, public.arcade_reward_purchases to service_role;

create or replace function public.arcade_apply_reward_event(
  target_school_id text,
  target_event_id text,
  target_exp integer,
  target_gems integer,
  target_is_win boolean
)
returns public.arcade_player_profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor public.user_profiles%rowtype;
  player public.arcade_player_profiles%rowtype;
  today_bkk date := (now() at time zone 'Asia/Bangkok')::date;
  daily_exp integer;
  daily_gems integer;
  daily_events integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if target_event_id is null or target_exp is null or target_gems is null or target_is_win is null
     or length(trim(target_event_id)) < 8 or length(target_event_id) > 120 then
    raise exception 'INVALID_EVENT_ID';
  end if;
  if target_exp < 0 or target_exp > 600 or target_gems < 0 or target_gems > 150
     or (target_exp = 0 and target_gems = 0) then
    raise exception 'REWARD_LIMIT_EXCEEDED';
  end if;

  select * into actor from public.user_profiles
  where id = auth.uid() and status = 'active' and school_id = target_school_id
    and role in ('student', 'teacher');
  if not found then raise exception 'SCHOOL_ACCESS_DENIED'; end if;

  insert into public.arcade_player_profiles (
    school_id, user_id, student_id, display_name, role
  ) values (
    target_school_id, auth.uid()::text, actor.student_id,
    coalesce(nullif(actor.full_name_th, ''), nullif(actor.full_name_en, ''), 'ผู้เล่น'), actor.role
  ) on conflict (school_id, user_id) do nothing;

  select * into player from public.arcade_player_profiles
  where school_id = target_school_id and user_id = auth.uid()::text for update;

  insert into public.arcade_reward_events (
    school_id, user_id, event_id, event_day, exp_delta, gems_delta
  ) values (
    target_school_id, auth.uid()::text, target_event_id, today_bkk, target_exp, target_gems
  ) on conflict (school_id, user_id, event_id) do nothing;
  if not found then return player; end if;

  select coalesce(sum(exp_delta), 0), coalesce(sum(gems_delta), 0), count(*)
    into daily_exp, daily_gems, daily_events
  from public.arcade_reward_events
  where school_id = target_school_id and user_id = auth.uid()::text and event_day = today_bkk;
  if daily_exp > 3000 or daily_gems > 750 or daily_events > 20 then
    raise exception 'DAILY_REWARD_LIMIT_EXCEEDED';
  end if;

  update public.arcade_player_profiles set
    exp = exp + target_exp,
    gems = gems + target_gems,
    battle_wins = battle_wins + case when target_is_win then 1 else 0 end,
    win_streak = case when target_is_win then win_streak + 1 else 0 end,
    daily_streak = case
      when last_played_date = today_bkk::text then greatest(daily_streak, 1)
      when last_played_date = (today_bkk - 1)::text then greatest(daily_streak, 1) + 1
      else 1 end,
    last_played_date = today_bkk::text,
    rank_title = case
      when exp + target_exp >= 5000 then 'Grandmaster Legend'
      when exp + target_exp >= 3000 then 'Diamond Strategist'
      when exp + target_exp >= 1800 then 'Platinum Striker'
      when exp + target_exp >= 900 then 'Gold Challenger'
      when exp + target_exp >= 350 then 'Silver Sprinter'
      else 'Rookie Explorer' end,
    updated_at = now()
  where school_id = target_school_id and user_id = auth.uid()::text
  returning * into player;
  return player;
end;
$$;

create or replace function public.arcade_redeem_reward(
  target_school_id text,
  target_request_id text,
  target_item_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor public.user_profiles%rowtype;
  player public.arcade_player_profiles%rowtype;
  item_title text;
  item_cost integer;
  item_category text;
  item_requires_approval boolean;
  item_frame text;
  item_label text;
  custom_item public.arcade_custom_rewards%rowtype;
  purchase_inserted integer;
  existing_purchase public.arcade_reward_purchases%rowtype;
  redemption public.arcade_reward_redemptions%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if target_request_id is null or length(target_request_id) < 8 or length(target_request_id) > 120 then
    raise exception 'INVALID_REQUEST_ID';
  end if;
  select * into actor from public.user_profiles
  where id = auth.uid() and status = 'active' and school_id = target_school_id and role = 'student';
  if not found then raise exception 'SCHOOL_ACCESS_DENIED'; end if;

  -- The database owns the default catalog prices; client-supplied price/title is never trusted.
  select catalog.title, catalog.cost, catalog.category, catalog.requires_approval,
         catalog.frame_id, catalog.label
    into item_title, item_cost, item_category, item_requires_approval, item_frame, item_label
  from (values
    ('perk-late-homework-pass', 'บัตรผ่านส่งงานช้า 1 วัน', 80, 'perk', true, null::text, null::text),
    ('perk-bonus-2-points', 'การ์ด +2 คะแนนจิตพิสัย', 120, 'perk', true, null::text, null::text),
    ('perk-seat-choice-pass', 'สิทธิ์เลือกที่นั่ง / คู่บัดดี้ 1 สัปดาห์', 65, 'perk', true, null::text, null::text),
    ('perk-canteen-voucher', 'คูปองเครื่องดื่ม / สหกรณ์โรงเรียน', 150, 'perk', true, null::text, null::text),
    ('cosmetic-frame-neon-cyan', 'กรอบโปรไฟล์ Neon Cyber', 45, 'frame', false, 'frame-neon-cyan', null::text),
    ('cosmetic-frame-solar-gold', 'กรอบโปรไฟล์ Solar Gold', 90, 'frame', false, 'frame-solar-gold', null::text),
    ('cosmetic-frame-cyber-rose', 'กรอบโปรไฟล์ Crimson Pulse', 60, 'frame', false, 'frame-cyber-rose', null::text),
    ('cosmetic-title-speed-demon', 'ฉายาพิเศษ: Speed Demon', 55, 'title', false, null::text, 'Speed Demon'),
    ('cosmetic-title-cyber-scholar', 'ฉายาพิเศษ: Cyber Scholar', 75, 'title', false, null::text, 'Cyber Scholar'),
    ('cosmetic-title-boss-slayer', 'ฉายาพิเศษ: Boss Slayer', 100, 'title', false, null::text, 'Boss Slayer')
  ) as catalog(id, title, cost, category, requires_approval, frame_id, label)
  where catalog.id = target_item_id;

  if item_title is null then
    select * into custom_item from public.arcade_custom_rewards
    where id = target_item_id and school_id = target_school_id for update;
    if not found then raise exception 'REWARD_NOT_FOUND'; end if;
    if custom_item.stock <= 0 then raise exception 'REWARD_OUT_OF_STOCK'; end if;
    item_title := custom_item.title_th;
    item_cost := custom_item.cost_gems;
    item_category := custom_item.category;
    item_requires_approval := custom_item.requires_approval;
    item_frame := null;
    item_label := null;
  end if;

  insert into public.arcade_player_profiles (school_id, user_id, student_id, display_name, role)
  values (target_school_id, auth.uid()::text, actor.student_id,
    coalesce(nullif(actor.full_name_th, ''), nullif(actor.full_name_en, ''), 'นักเรียน'), 'student')
  on conflict (school_id, user_id) do nothing;
  select * into player from public.arcade_player_profiles
  where school_id = target_school_id and user_id = auth.uid()::text for update;

  insert into public.arcade_reward_purchases (id, school_id, user_id, item_id, cost_gems)
  values (target_request_id, target_school_id, auth.uid()::text, target_item_id, item_cost)
  on conflict (id) do nothing;
  get diagnostics purchase_inserted = row_count;
  if purchase_inserted = 0 then
    select * into existing_purchase from public.arcade_reward_purchases where id = target_request_id;
    if existing_purchase.user_id <> auth.uid()::text or existing_purchase.school_id <> target_school_id then
      raise exception 'REQUEST_ID_ALREADY_USED';
    end if;
    select * into redemption from public.arcade_reward_redemptions
    where id = target_request_id and user_id = auth.uid()::text and school_id = target_school_id;
    return jsonb_build_object('profile', to_jsonb(player), 'redemption',
      case when redemption.id is null then null else to_jsonb(redemption) end, 'duplicate', true);
  end if;

  if player.gems < item_cost then raise exception 'INSUFFICIENT_GEMS'; end if;
  if custom_item.id is not null then
    update public.arcade_custom_rewards set stock = stock - 1
    where id = target_item_id and school_id = target_school_id and stock > 0;
    if not found then raise exception 'REWARD_OUT_OF_STOCK'; end if;
  end if;

  update public.arcade_player_profiles set
    gems = gems - item_cost,
    unlocked_item_ids = case when item_category in ('frame', 'title')
      then (select coalesce(jsonb_agg(distinct value), '[]'::jsonb)
            from jsonb_array_elements_text(unlocked_item_ids || jsonb_build_array(target_item_id)) as entries(value))
      else unlocked_item_ids end,
    equipped_frame_id = coalesce(item_frame, equipped_frame_id),
    equipped_title = coalesce(item_label, equipped_title),
    updated_at = now()
  where school_id = target_school_id and user_id = auth.uid()::text
  returning * into player;

  if item_category not in ('frame', 'title') then
    insert into public.arcade_reward_redemptions (
      id, school_id, user_id, student_name, item_id, item_title_th,
      cost_gems, category, status, requested_at
    ) values (
      target_request_id, target_school_id, auth.uid()::text,
      coalesce(nullif(actor.full_name_th, ''), nullif(actor.full_name_en, ''), 'นักเรียน'),
      target_item_id, item_title, item_cost, item_category,
      case when item_requires_approval then 'pending' else 'approved' end, now()
    ) returning * into redemption;
  end if;

  return jsonb_build_object('profile', to_jsonb(player),
    'redemption', case when redemption.id is null then null else to_jsonb(redemption) end,
    'duplicate', false);
end;
$$;

create or replace function public.arcade_review_reward_redemption(
  target_school_id text,
  target_request_id text,
  target_status text,
  target_reviewer text,
  target_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_row public.arcade_reward_redemptions%rowtype;
  player public.arcade_player_profiles%rowtype;
  reviewer_name text;
begin
  if auth.uid() is null or target_status not in ('approved', 'rejected') then
    raise exception 'INVALID_REVIEW';
  end if;
  if not public.has_school_role(target_school_id, ARRAY['super_admin', 'admin', 'teacher']) then
    raise exception 'SCHOOL_ACCESS_DENIED';
  end if;
  select coalesce(nullif(full_name_th, ''), nullif(full_name_en, ''), auth.uid()::text)
    into reviewer_name from public.user_profiles where id = auth.uid() and status = 'active';
  select * into request_row from public.arcade_reward_redemptions
  where id = target_request_id and school_id = target_school_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if request_row.status <> 'pending' then
    return jsonb_build_object('redemption', to_jsonb(request_row), 'duplicate', true);
  end if;
  update public.arcade_reward_redemptions set
    status = target_status, reviewed_by = reviewer_name,
    reviewed_at = now(), teacher_note = target_note
  where id = target_request_id and school_id = target_school_id
  returning * into request_row;
  if target_status = 'rejected' then
    update public.arcade_player_profiles set gems = gems + request_row.cost_gems, updated_at = now()
    where school_id = target_school_id and user_id = request_row.user_id returning * into player;
  end if;
  return jsonb_build_object('redemption', to_jsonb(request_row),
    'profile', case when player.user_id is null then null else to_jsonb(player) end,
    'duplicate', false);
end;
$$;

revoke all on function public.arcade_apply_reward_event(text, text, integer, integer, boolean) from public, anon;
revoke all on function public.arcade_redeem_reward(text, text, text) from public, anon;
revoke all on function public.arcade_review_reward_redemption(text, text, text, text, text) from public, anon;
grant execute on function public.arcade_apply_reward_event(text, text, integer, integer, boolean) to authenticated;
grant execute on function public.arcade_redeem_reward(text, text, text) to authenticated;
grant execute on function public.arcade_review_reward_redemption(text, text, text, text, text) to authenticated;

-- EXP/Gems, inventory and win statistics are only changed by the RPCs above.
revoke insert, update on public.arcade_player_profiles from authenticated;
grant select on public.arcade_player_profiles to authenticated;
grant update (equipped_frame_id, equipped_title, updated_at)
  on public.arcade_player_profiles to authenticated;
revoke insert, update on public.arcade_reward_redemptions from authenticated;
revoke update (status, reviewed_by, reviewed_at, teacher_note)
  on public.arcade_reward_redemptions from authenticated;
grant select on public.arcade_reward_redemptions to authenticated;

notify pgrst, 'reload schema';
commit;
