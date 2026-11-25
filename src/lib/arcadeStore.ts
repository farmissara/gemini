import { PlayerScore, RewardItem, RewardRedemptionRequest } from '../types';
import { getSupabaseClient } from './supabase';

export interface ProfileFrameDef {
  id: string;
  nameTh: string;
  nameEn: string;
  ringClass: string;
  badgeTextClass: string;
  previewGradient: string;
}

export const PROFILE_FRAMES: ProfileFrameDef[] = [
  {
    id: 'frame-default',
    nameTh: 'กรอบมาตรฐาน',
    nameEn: 'Default Frame',
    ringClass: 'ring-2 ring-zinc-700',
    badgeTextClass: 'text-zinc-300',
    previewGradient: 'from-zinc-700 to-zinc-800',
  },
  {
    id: 'frame-neon-cyan',
    nameTh: 'กรอบ Neon Cyber',
    nameEn: 'Neon Cyber Frame',
    ringClass: 'ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.45)]',
    badgeTextClass: 'text-cyan-300',
    previewGradient: 'from-cyan-400 via-sky-500 to-blue-600',
  },
  {
    id: 'frame-solar-gold',
    nameTh: 'กรอบ Solar Gold',
    nameEn: 'Solar Gold Frame',
    ringClass: 'ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.5)]',
    badgeTextClass: 'text-amber-300',
    previewGradient: 'from-amber-300 via-yellow-400 to-orange-500',
  },
  {
    id: 'frame-cyber-rose',
    nameTh: 'กรอบ Crimson Pulse',
    nameEn: 'Crimson Pulse Frame',
    ringClass: 'ring-2 ring-rose-400 shadow-[0_0_16px_rgba(251,113,133,0.45)]',
    badgeTextClass: 'text-rose-300',
    previewGradient: 'from-rose-400 via-pink-500 to-fuchsia-600',
  },
  {
    id: 'frame-emerald-matrix',
    nameTh: 'กรอบ Emerald Matrix',
    nameEn: 'Emerald Matrix Frame',
    ringClass: 'ring-2 ring-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.45)]',
    badgeTextClass: 'text-emerald-300',
    previewGradient: 'from-emerald-400 via-teal-400 to-cyan-500',
  },
];

export const getProfileFrame = (frameId?: string): ProfileFrameDef =>
  PROFILE_FRAMES.find((f) => f.id === frameId) || PROFILE_FRAMES[0];

export const DEFAULT_ARCADE_REWARDS: RewardItem[] = [
  // Real School Perks (Teacher Approval Workflow)
  {
    id: 'perk-late-homework-pass',
    titleTh: 'บัตรผ่านส่งงานช้า 1 วัน',
    titleEn: '1-Day Late Assignment Pass',
    costGems: 80,
    category: 'perk',
    stock: 20,
    iconName: 'clock',
    descriptionTh: 'ใช้สิทธิ์ขยายเวลาส่งการบ้าน 1 วันในวิชาที่ร่วมรายการ (รอครูประจำวิชาอนุมัติ)',
    requiresApproval: true,
  },
  {
    id: 'perk-bonus-2-points',
    titleTh: 'การ์ด +2 คะแนนจิตพิสัย',
    titleEn: '+2 Bonus Participation Points',
    costGems: 120,
    category: 'perk',
    stock: 15,
    iconName: 'sparkles',
    descriptionTh: 'แลกรับคะแนนพิเศษ/คะแนนจิตพิสัย +2 คะแนน โดยครูตรวจสอบและกดอนุมัติในระบบ',
    requiresApproval: true,
  },
  {
    id: 'perk-seat-choice-pass',
    titleTh: 'สิทธิ์เลือกที่นั่ง / คู่บัดดี้ 1 สัปดาห์',
    titleEn: '1-Week Seat Choice Pass',
    costGems: 65,
    category: 'perk',
    stock: 25,
    iconName: 'star',
    descriptionTh: 'เลือกที่นั่งในห้องเรียนหรือเลือกคู่ทำกิจกรรมกลุ่มได้ก่อนเพื่อน 1 สัปดาห์',
    requiresApproval: true,
  },
  {
    id: 'perk-canteen-voucher',
    titleTh: 'คูปองเครื่องดื่ม / สหกรณ์โรงเรียน',
    titleEn: 'Campus Co-op Voucher',
    costGems: 150,
    category: 'perk',
    stock: 12,
    iconName: 'gift',
    descriptionTh: 'แลกรับสิทธิ์คูปองส่วนลดสหกรณ์หรือกิจกรรมพิเศษของโรงเรียนหลังครูอนุมัติ',
    requiresApproval: true,
  },
  // Gen Z Instant-Equip Cosmetic Frames & Titles
  {
    id: 'cosmetic-frame-neon-cyan',
    titleTh: 'กรอบโปรไฟล์ Neon Cyber',
    titleEn: 'Neon Cyber Profile Frame',
    costGems: 45,
    category: 'frame',
    stock: 999,
    iconName: 'frame',
    descriptionTh: 'กรอบเรืองแสงสีฟ้าไซเบอร์ สวมใส่ได้ทันทีบนหน้าหลัก ตารางอันดับ และโปรไฟล์',
    frameId: 'frame-neon-cyan',
    requiresApproval: false,
  },
  {
    id: 'cosmetic-frame-solar-gold',
    titleTh: 'กรอบโปรไฟล์ Solar Gold',
    titleEn: 'Solar Gold Profile Frame',
    costGems: 90,
    category: 'frame',
    stock: 999,
    iconName: 'frame',
    descriptionTh: 'กรอบทองพรีเมียมสำหรับสายล่าท็อปบอร์ด สวมใส่ได้ทันทีหลังแลก',
    frameId: 'frame-solar-gold',
    requiresApproval: false,
  },
  {
    id: 'cosmetic-frame-cyber-rose',
    titleTh: 'กรอบโปรไฟล์ Crimson Pulse',
    titleEn: 'Crimson Pulse Profile Frame',
    costGems: 60,
    category: 'frame',
    stock: 999,
    iconName: 'frame',
    descriptionTh: 'กรอบนีออนชมพู-แดงสะดุดตา โดดเด่นทุกครั้งที่ติดอันดับในห้องเรียนสด',
    frameId: 'frame-cyber-rose',
    requiresApproval: false,
  },
  {
    id: 'cosmetic-title-speed-demon',
    titleTh: 'ฉายาพิเศษ: Speed Demon',
    titleEn: 'Title: Speed Demon',
    costGems: 55,
    category: 'title',
    stock: 999,
    iconName: 'award',
    descriptionTh: 'ติดฉายา "Speed Demon" ใต้ชื่อของคุณบนหน้าหลักและตารางอันดับโรงเรียน',
    titleLabel: 'Speed Demon',
    requiresApproval: false,
  },
  {
    id: 'cosmetic-title-cyber-scholar',
    titleTh: 'ฉายาพิเศษ: Cyber Scholar',
    titleEn: 'Title: Cyber Scholar',
    costGems: 75,
    category: 'title',
    stock: 999,
    iconName: 'award',
    descriptionTh: 'ติดฉายา "Cyber Scholar" สำหรับตัวตึงสายวิชาการและแล็บจำลอง',
    titleLabel: 'Cyber Scholar',
    requiresApproval: false,
  },
  {
    id: 'cosmetic-title-boss-slayer',
    titleTh: 'ฉายาพิเศษ: Boss Slayer',
    titleEn: 'Title: Boss Slayer',
    costGems: 100,
    category: 'title',
    stock: 999,
    iconName: 'award',
    descriptionTh: 'ติดฉายา "Boss Slayer" นักโค่นบอสประจำห้องเรียน',
    titleLabel: 'Boss Slayer',
    requiresApproval: false,
  },
];

export function triggerHaptic(kind: 'light' | 'success' | 'heavy' | 'error' = 'light'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    if (kind === 'light') navigator.vibrate(14);
    else if (kind === 'success') navigator.vibrate([18, 36, 28]);
    else if (kind === 'heavy') navigator.vibrate([32, 24, 48]);
    else if (kind === 'error') navigator.vibrate([45, 30, 45]);
  } catch {
    // Ignore unsupported or blocked haptics
  }
}

export function getBangkokDateKey(date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function computeUpdatedDailyStreak(
  prevDailyStreak?: number,
  prevLastPlayedDate?: string
): { dailyStreak: number; lastPlayedDate: string; incrementedToday: boolean } {
  const today = getBangkokDateKey();
  const baseStreak = Math.max(0, prevDailyStreak || 0);

  if (prevLastPlayedDate === today) {
    return {
      dailyStreak: Math.max(1, baseStreak),
      lastPlayedDate: today,
      incrementedToday: false,
    };
  }

  if (prevLastPlayedDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getBangkokDateKey(yesterday);
    if (prevLastPlayedDate === yesterdayKey) {
      return {
        dailyStreak: Math.max(1, baseStreak) + 1,
        lastPlayedDate: today,
        incrementedToday: true,
      };
    }
  }

  return {
    dailyStreak: 1,
    lastPlayedDate: today,
    incrementedToday: true,
  };
}

export function computeRankTitle(exp: number): string {
  if (exp >= 5000) return 'Grandmaster Legend';
  if (exp >= 3000) return 'Diamond Strategist';
  if (exp >= 1800) return 'Platinum Striker';
  if (exp >= 900) return 'Gold Challenger';
  if (exp >= 350) return 'Silver Sprinter';
  return 'Rookie Explorer';
}

const isMissingArcadeTableError = (error: unknown): boolean => {
  const err = error as { code?: string; message?: string } | null;
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
};

const profilesStorageKey = (schoolId: string) => `eduverse_arcade_profiles_v1_${schoolId}`;
const redemptionsStorageKey = (schoolId: string) => `eduverse_arcade_redemptions_v1_${schoolId}`;
const customRewardsStorageKey = (schoolId: string) => `eduverse_arcade_custom_rewards_v1_${schoolId}`;

const ARCADE_PROFILE_SELECT =
  'user_id, school_id, student_id, display_name, role, avatar_url, exp, gems, rank_title, battle_wins, win_streak, daily_streak, last_played_date, equipped_frame_id, equipped_title, unlocked_item_ids';
const ARCADE_REDEMPTION_SELECT =
  'id, school_id, user_id, student_name, grade_room, item_id, item_title_th, cost_gems, category, status, requested_at, reviewed_by, reviewed_at, teacher_note';
const ARCADE_CUSTOM_REWARD_SELECT =
  'id, school_id, title_th, title_en, cost_gems, category, stock, icon_name, description_th, requires_approval';

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors
  }
}

function mapArcadeProfile(row: Record<string, unknown>, fallbackSchoolId = ''): PlayerScore {
  const exp = Number(row.exp || 0);
  return {
    userId: String(row.user_id || ''),
    schoolId: String(row.school_id || fallbackSchoolId),
    studentId: row.student_id ? String(row.student_id) : undefined,
    name: String(row.display_name || 'ผู้เล่น'),
    role: row.role === 'teacher' ? 'teacher' : 'student',
    avatarUrl: String(row.avatar_url || ''),
    exp,
    gems: Number(row.gems || 0),
    rankTitle: String(row.rank_title || computeRankTitle(exp)),
    battleWins: Number(row.battle_wins || 0),
    streak: Number(row.win_streak || 0),
    dailyStreak: Number(row.daily_streak || 0),
    lastPlayedDate: row.last_played_date ? String(row.last_played_date) : undefined,
    equippedFrameId: row.equipped_frame_id ? String(row.equipped_frame_id) : 'frame-default',
    equippedTitle: row.equipped_title ? String(row.equipped_title) : undefined,
    unlockedItemIds: Array.isArray(row.unlocked_item_ids)
      ? (row.unlocked_item_ids as string[])
      : [],
  };
}

export async function loadSchoolArcadeProfiles(schoolId: string): Promise<PlayerScore[]> {
  if (!schoolId) return [];
  const localProfiles = readLocalJson<PlayerScore[]>(profilesStorageKey(schoolId), []);
  const client = getSupabaseClient();
  if (!client) {
    return [...localProfiles].sort((a, b) => b.exp - a.exp);
  }

  try {
    const { data, error } = await client
      .from('arcade_player_profiles')
      .select(ARCADE_PROFILE_SELECT)
      .eq('school_id', schoolId)
      .order('exp', { ascending: false })
      .limit(100);

    if (error) {
      if (!isMissingArcadeTableError(error)) {
        console.warn('Could not load arcade_player_profiles:', error.message);
      }
      return [...localProfiles].sort((a, b) => b.exp - a.exp);
    }

    const remoteProfiles: PlayerScore[] = (data || []).map((row: Record<string, unknown>) =>
      mapArcadeProfile(row, schoolId));

    // Merge remote with any newer local-only profiles
    const byUserId = new Map<string, PlayerScore>();
    localProfiles.forEach((p) => byUserId.set(p.userId, p));
    remoteProfiles.forEach((p) => {
      const local = byUserId.get(p.userId);
      if (!local || p.exp >= local.exp) {
        byUserId.set(p.userId, p);
      }
    });

    const merged = Array.from(byUserId.values()).sort((a, b) => b.exp - a.exp);
    writeLocalJson(profilesStorageKey(schoolId), merged);
    return merged;
  } catch {
    return [...localProfiles].sort((a, b) => b.exp - a.exp);
  }
}

export async function loadAuthoritativeArcadeProfile(
  schoolId: string,
  userId: string,
): Promise<PlayerScore | null> {
  const client = getSupabaseClient();
  if (!client || !schoolId || !userId) return null;
  const { data, error } = await client.from('arcade_player_profiles').select(ARCADE_PROFILE_SELECT)
    .eq('school_id', schoolId).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const profile = mapArcadeProfile(data as Record<string, unknown>, schoolId);
  const local = readLocalJson<PlayerScore[]>(profilesStorageKey(schoolId), []);
  writeLocalJson(profilesStorageKey(schoolId), [profile, ...local.filter((entry) => entry.userId !== userId)]);
  return profile;
}

export async function upsertArcadePlayerProfile(
  schoolId: string,
  profile: PlayerScore
): Promise<void> {
  if (!schoolId || !profile.userId) return;

  const existing = readLocalJson<PlayerScore[]>(profilesStorageKey(schoolId), []);
  const next = existing.some((p) => p.userId === profile.userId)
    ? existing.map((p) => (p.userId === profile.userId ? { ...p, ...profile, schoolId } : p))
    : [{ ...profile, schoolId }, ...existing];
  next.sort((a, b) => b.exp - a.exp);
  writeLocalJson(profilesStorageKey(schoolId), next);

  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('arcade_player_profiles').update({
      equipped_frame_id: profile.equippedFrameId || 'frame-default',
      equipped_title: profile.equippedTitle || null,
      updated_at: new Date().toISOString(),
    }).eq('school_id', schoolId).eq('user_id', profile.userId);
    if (error && !isMissingArcadeTableError(error)) {
      console.warn('Could not sync arcade_player_profiles:', error.message);
    }
  } catch {
    // Keep local cache safely
  }
}

export async function awardArcadeRewardEvent(
  schoolId: string,
  eventId: string,
  exp: number,
  gems: number,
  isWin: boolean,
): Promise<PlayerScore | null> {
  const client = getSupabaseClient();
  if (!client || !schoolId) return null;
  const { data, error } = await client.rpc('arcade_apply_reward_event', {
    target_school_id: schoolId,
    target_event_id: eventId,
    target_exp: exp,
    target_gems: gems,
    target_is_win: isWin,
  });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object') return null;
  const profile = mapArcadeProfile(data as Record<string, unknown>, schoolId);
  const local = readLocalJson<PlayerScore[]>(profilesStorageKey(schoolId), []);
  writeLocalJson(profilesStorageKey(schoolId), [
    profile,
    ...local.filter((entry) => entry.userId !== profile.userId),
  ].sort((a, b) => b.exp - a.exp));
  return profile;
}

export async function redeemArcadeReward(
  schoolId: string,
  requestId: string,
  itemId: string,
): Promise<{ profile: PlayerScore; redemption: RewardRedemptionRequest | null } | null> {
  const client = getSupabaseClient();
  if (!client || !schoolId) return null;
  const { data, error } = await client.rpc('arcade_redeem_reward', {
    target_school_id: schoolId,
    target_request_id: requestId,
    target_item_id: itemId,
  });
  if (error) throw new Error(error.message);
  const result = data as Record<string, unknown> | null;
  if (!result || typeof result.profile !== 'object' || !result.profile) return null;
  const profile = mapArcadeProfile(result.profile as Record<string, unknown>, schoolId);
  let redemption: RewardRedemptionRequest | null = null;
  if (result.redemption && typeof result.redemption === 'object') {
    const row = result.redemption as Record<string, unknown>;
    redemption = {
      id: String(row.id || requestId),
      schoolId: String(row.school_id || schoolId),
      userId: String(row.user_id || profile.userId),
      studentName: String(row.student_name || profile.name),
      gradeRoom: row.grade_room ? String(row.grade_room) : undefined,
      itemId: String(row.item_id || itemId),
      itemTitleTh: String(row.item_title_th || 'รางวัล'),
      costGems: Number(row.cost_gems || 0),
      category: (row.category as RewardItem['category']) || 'perk',
      status: (row.status as RewardRedemptionRequest['status']) || 'pending',
      requestedAt: String(row.requested_at || new Date().toISOString()),
      reviewedBy: row.reviewed_by ? String(row.reviewed_by) : undefined,
      reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined,
      teacherNote: row.teacher_note ? String(row.teacher_note) : undefined,
    };
  }
  const localProfiles = readLocalJson<PlayerScore[]>(profilesStorageKey(schoolId), []);
  writeLocalJson(profilesStorageKey(schoolId), [profile, ...localProfiles.filter((entry) => entry.userId !== profile.userId)]);
  if (redemption) {
    const localRequests = readLocalJson<RewardRedemptionRequest[]>(redemptionsStorageKey(schoolId), []);
    writeLocalJson(redemptionsStorageKey(schoolId), [redemption, ...localRequests.filter((entry) => entry.id !== redemption?.id)]);
  }
  return { profile, redemption };
}

export async function loadSchoolRewardRedemptions(
  schoolId: string
): Promise<RewardRedemptionRequest[]> {
  if (!schoolId) return [];
  const localList = readLocalJson<RewardRedemptionRequest[]>(redemptionsStorageKey(schoolId), []);
  const client = getSupabaseClient();
  if (!client) return localList;

  try {
    const { data, error } = await client
      .from('arcade_reward_redemptions')
      .select(ARCADE_REDEMPTION_SELECT)
      .eq('school_id', schoolId)
      .order('requested_at', { ascending: false })
      .limit(150);

    if (error) {
      if (!isMissingArcadeTableError(error)) {
        console.warn('Could not load arcade_reward_redemptions:', error.message);
      }
      return localList;
    }

    const remoteList: RewardRedemptionRequest[] = (data || []).map(
      (row: Record<string, unknown>) => ({
        id: String(row.id || ''),
        schoolId: String(row.school_id || schoolId),
        userId: String(row.user_id || ''),
        studentName: String(row.student_name || 'นักเรียน'),
        gradeRoom: row.grade_room ? String(row.grade_room) : undefined,
        itemId: String(row.item_id || ''),
        itemTitleTh: String(row.item_title_th || 'รางวัล'),
        costGems: Number(row.cost_gems || 0),
        category: (row.category as RewardItem['category']) || 'perk',
        status: (row.status as RewardRedemptionRequest['status']) || 'pending',
        requestedAt: String(row.requested_at || new Date().toISOString()),
        reviewedBy: row.reviewed_by ? String(row.reviewed_by) : undefined,
        reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined,
        teacherNote: row.teacher_note ? String(row.teacher_note) : undefined,
      })
    );

    const byId = new Map<string, RewardRedemptionRequest>();
    localList.forEach((r) => byId.set(r.id, r));
    remoteList.forEach((r) => byId.set(r.id, r));
    const merged = Array.from(byId.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
    writeLocalJson(redemptionsStorageKey(schoolId), merged);
    return merged;
  } catch {
    return localList;
  }
}

export async function createRewardRedemptionRequest(
  schoolId: string,
  req: RewardRedemptionRequest
): Promise<void> {
  if (!schoolId) return;
  const existing = readLocalJson<RewardRedemptionRequest[]>(redemptionsStorageKey(schoolId), []);
  const next = [req, ...existing.filter((r) => r.id !== req.id)];
  writeLocalJson(redemptionsStorageKey(schoolId), next);
}

export async function updateRewardRedemptionStatus(
  schoolId: string,
  requestId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  teacherNote?: string
): Promise<PlayerScore | null> {
  if (!schoolId) return null;
  const reviewedAt = new Date().toISOString();
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client.rpc('arcade_review_reward_redemption', {
      target_school_id: schoolId,
      target_request_id: requestId,
      target_status: status,
      target_reviewer: reviewedBy,
      target_note: teacherNote || null,
    });
    if (error) throw new Error(error.message);
    const result = data as Record<string, unknown> | null;
    if (result?.redemption && typeof result.redemption === 'object') {
      const row = result.redemption as Record<string, unknown>;
      const localRequests = readLocalJson<RewardRedemptionRequest[]>(redemptionsStorageKey(schoolId), []);
      const reviewed: RewardRedemptionRequest = {
        id: String(row.id || requestId),
        schoolId: String(row.school_id || schoolId),
        userId: String(row.user_id || ''),
        studentName: String(row.student_name || 'นักเรียน'),
        gradeRoom: row.grade_room ? String(row.grade_room) : undefined,
        itemId: String(row.item_id || ''),
        itemTitleTh: String(row.item_title_th || 'รางวัล'),
        costGems: Number(row.cost_gems || 0),
        category: (row.category as RewardItem['category']) || 'perk',
        status: (row.status as RewardRedemptionRequest['status']) || status,
        requestedAt: String(row.requested_at || reviewedAt),
        reviewedBy: row.reviewed_by ? String(row.reviewed_by) : undefined,
        reviewedAt: row.reviewed_at ? String(row.reviewed_at) : undefined,
        teacherNote: row.teacher_note ? String(row.teacher_note) : undefined,
      };
      writeLocalJson(redemptionsStorageKey(schoolId), localRequests.map((entry) => entry.id === requestId ? reviewed : entry));
    }
    if (result?.profile && typeof result.profile === 'object') {
      const profile = mapArcadeProfile(result.profile as Record<string, unknown>, schoolId);
      const localProfiles = readLocalJson<PlayerScore[]>(profilesStorageKey(schoolId), []);
      writeLocalJson(profilesStorageKey(schoolId), [profile, ...localProfiles.filter((entry) => entry.userId !== profile.userId)]);
      return profile;
    }
    return null;
  }
  const existing = readLocalJson<RewardRedemptionRequest[]>(redemptionsStorageKey(schoolId), []);
  const next = existing.map((r) =>
    r.id === requestId ? { ...r, status, reviewedBy, reviewedAt, teacherNote } : r
  );
  writeLocalJson(redemptionsStorageKey(schoolId), next);
  if (status === 'rejected') {
    const target = existing.find((request) => request.id === requestId);
    if (target) {
      const players = readLocalJson<PlayerScore[]>(profilesStorageKey(schoolId), []);
      const refunded = players.map((player) => player.userId === target.userId
        ? { ...player, gems: player.gems + target.costGems }
        : player);
      writeLocalJson(profilesStorageKey(schoolId), refunded);
      return refunded.find((player) => player.userId === target.userId) || null;
    }
  }
  return null;
}

export async function loadSchoolRewardsCatalog(schoolId: string): Promise<RewardItem[]> {
  if (!schoolId) return DEFAULT_ARCADE_REWARDS;
  const localCustom = readLocalJson<RewardItem[]>(customRewardsStorageKey(schoolId), []);
  const client = getSupabaseClient();

  let remoteCustom: RewardItem[] = [];
  if (client) {
    try {
      const { data, error } = await client
        .from('arcade_custom_rewards')
        .select(ARCADE_CUSTOM_REWARD_SELECT)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        remoteCustom = data.map((row: Record<string, unknown>) => ({
          id: String(row.id || ''),
          schoolId: String(row.school_id || schoolId),
          titleTh: String(row.title_th || ''),
          titleEn: String(row.title_en || row.title_th || ''),
          costGems: Number(row.cost_gems || 50),
          category: (row.category as RewardItem['category']) || 'perk',
          stock: Number(row.stock ?? 20),
          iconName: String(row.icon_name || 'gift'),
          descriptionTh: String(row.description_th || ''),
          requiresApproval: row.requires_approval !== false,
        }));
      }
    } catch {
      // fallback to local custom
    }
  }

  const byId = new Map<string, RewardItem>();
  DEFAULT_ARCADE_REWARDS.forEach((item) => byId.set(item.id, item));
  localCustom.forEach((item) => byId.set(item.id, item));
  remoteCustom.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
}

export async function saveSchoolCustomReward(
  schoolId: string,
  item: RewardItem
): Promise<void> {
  if (!schoolId) return;
  const localCustom = readLocalJson<RewardItem[]>(customRewardsStorageKey(schoolId), []);
  const next = [{ ...item, schoolId }, ...localCustom.filter((r) => r.id !== item.id)];
  writeLocalJson(customRewardsStorageKey(schoolId), next);

  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('arcade_custom_rewards').upsert(
      {
        id: item.id,
        school_id: schoolId,
        title_th: item.titleTh,
        title_en: item.titleEn || item.titleTh,
        cost_gems: item.costGems,
        category: item.category,
        stock: item.stock,
        icon_name: item.iconName || 'gift',
        description_th: item.descriptionTh,
        requires_approval: item.requiresApproval !== false,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error && !isMissingArcadeTableError(error)) {
      console.warn('Could not save arcade_custom_rewards:', error.message);
    }
  } catch {
    // Keep local cache safely
  }
}
