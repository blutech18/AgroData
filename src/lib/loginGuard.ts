// Client-side soft lockout after repeated failed logins (manuscript Login AF-1).
// Note: Supabase also enforces server-side auth rate limiting; this adds the
// documented "locked after 3 attempts" UX on top of that.

const KEY = "agrodata:login-attempts";
const MAX_ATTEMPTS = 3;
const LOCK_MS = 5 * 60 * 1000; // 5 minutes

interface AttemptRecord {
  count: number;
  lockedUntil: number | null;
}

type AttemptMap = Record<string, AttemptRecord>;

function readMap(): AttemptMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as AttemptMap;
  } catch {
    return {};
  }
}

function writeMap(map: AttemptMap) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

function normalize(email: string) {
  return email.trim().toLowerCase();
}

/** Remaining lockout time in milliseconds (0 if not locked). */
export function getLockRemaining(email: string): number {
  const rec = readMap()[normalize(email)];
  if (!rec?.lockedUntil) return 0;
  const remaining = rec.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/** Records a failed attempt; returns remaining attempts before lock (0 = now locked). */
export function registerFailure(email: string): { remaining: number; lockMs: number } {
  const map = readMap();
  const key = normalize(email);
  const rec = map[key] ?? { count: 0, lockedUntil: null };
  rec.count += 1;

  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCK_MS;
    rec.count = 0;
    map[key] = rec;
    writeMap(map);
    return { remaining: 0, lockMs: LOCK_MS };
  }

  map[key] = rec;
  writeMap(map);
  return { remaining: MAX_ATTEMPTS - rec.count, lockMs: 0 };
}

export function clearAttempts(email: string) {
  const map = readMap();
  delete map[normalize(email)];
  writeMap(map);
}

export { MAX_ATTEMPTS, LOCK_MS };
