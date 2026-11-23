-- Per-school Gemini credential vault and monthly request accounting.
-- Secrets are encrypted by the application before they reach Postgres.

begin;

create table if not exists public.school_ai_secrets (
  school_id text primary key references public.schools(id) on delete cascade,
  key_ciphertext text,
  key_iv text,
  key_auth_tag text,
  key_last4 text,
  enabled boolean not null default true,
  monthly_request_limit integer not null default 300,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint school_ai_secrets_request_limit_check
    check (monthly_request_limit between 10 and 20000),
  constraint school_ai_secrets_cipher_fields_check
    check (
      (key_ciphertext is null and key_iv is null and key_auth_tag is null and key_last4 is null)
      or (key_ciphertext is not null and key_iv is not null and key_auth_tag is not null and key_last4 is not null)
    )
);

create table if not exists public.school_ai_requests (
  request_id uuid primary key,
  school_id text not null references public.schools(id) on delete cascade,
  user_id uuid not null,
  period_start date not null,
  started_at timestamptz not null default now(),
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'succeeded', 'failed'))
);

create index if not exists school_ai_requests_school_period_idx
  on public.school_ai_requests (school_id, period_start, started_at desc);

alter table public.school_ai_secrets enable row level security;
alter table public.school_ai_requests enable row level security;
revoke all on public.school_ai_secrets, public.school_ai_requests from public, anon, authenticated;
grant select, insert, update, delete on public.school_ai_secrets, public.school_ai_requests to service_role;

create or replace function public.reserve_school_ai_request(
  target_school_id text,
  target_user_id uuid,
  target_request_id uuid
)
returns table(allowed boolean, used_requests integer, monthly_limit integer, period_start date)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  secret_row public.school_ai_secrets%rowtype;
  current_period date := date_trunc('month', now() at time zone 'UTC')::date;
  current_count integer;
begin
  select * into secret_row from public.school_ai_secrets
  where school_id = target_school_id and enabled and key_ciphertext is not null
  for update;
  if not found then
    return query select false, 0, 0, current_period;
    return;
  end if;

  select count(*)::integer into current_count from public.school_ai_requests
  where school_id = target_school_id and school_ai_requests.period_start = current_period;
  if current_count >= secret_row.monthly_request_limit then
    return query select false, current_count, secret_row.monthly_request_limit, current_period;
    return;
  end if;

  insert into public.school_ai_requests (request_id, school_id, user_id, period_start)
  values (target_request_id, target_school_id, target_user_id, current_period);
  return query select true, current_count + 1, secret_row.monthly_request_limit, current_period;
end;
$$;

create or replace function public.record_school_ai_request_result(
  target_school_id text,
  target_request_id uuid,
  target_prompt_tokens integer,
  target_output_tokens integer,
  target_status text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if target_prompt_tokens < 0 or target_prompt_tokens > 1000000
     or target_output_tokens < 0 or target_output_tokens > 1000000
     or target_status not in ('succeeded', 'failed') then
    raise exception 'INVALID_AI_USAGE_RESULT';
  end if;
  update public.school_ai_requests set
    prompt_tokens = target_prompt_tokens,
    output_tokens = target_output_tokens,
    status = target_status
  where school_id = target_school_id and request_id = target_request_id;
  return found;
end;
$$;

create or replace function public.school_ai_usage_summary(target_school_id text)
returns table(period_start date, request_count integer, prompt_tokens bigint, output_tokens bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select date_trunc('month', now() at time zone 'UTC')::date,
         count(*)::integer,
         coalesce(sum(request.prompt_tokens), 0),
         coalesce(sum(request.output_tokens), 0)
  from public.school_ai_requests request
  where request.school_id = target_school_id
    and request.period_start = date_trunc('month', now() at time zone 'UTC')::date;
$$;

revoke all on function public.reserve_school_ai_request(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_school_ai_request_result(text, uuid, integer, integer, text) from public, anon, authenticated;
revoke all on function public.school_ai_usage_summary(text) from public, anon, authenticated;
grant execute on function public.reserve_school_ai_request(text, uuid, uuid) to service_role;
grant execute on function public.record_school_ai_request_result(text, uuid, integer, integer, text) to service_role;
grant execute on function public.school_ai_usage_summary(text) to service_role;

notify pgrst, 'reload schema';
commit;
