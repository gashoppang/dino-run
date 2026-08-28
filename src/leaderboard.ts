export type PlayerId = "1p" | "2p";

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  createdAt: number;
}

export interface RecordedScore {
  entry: LeaderboardEntry;
  isNewBest: boolean;
}

interface LegacyScoreStorage {
  removeItem(key: string): void;
}

export const LEGACY_LEADERBOARD_KEY = "dino-run:leaderboard:v1";
const MAX_ENTRIES = 100;
const MAX_NAME_LENGTH = 12;

export function normalizeName(value: string): string {
  return Array.from(value.trim().replace(/\s+/g, " "))
    .slice(0, MAX_NAME_LENGTH)
    .join("");
}

function normalizeEntry(value: unknown): LeaderboardEntry | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entry = value as Partial<LeaderboardEntry> & { id?: string | number };
  if (
    (typeof entry.id !== "string" && typeof entry.id !== "number") ||
    typeof entry.name !== "string" ||
    typeof entry.score !== "number" ||
    !Number.isFinite(entry.score) ||
    typeof entry.createdAt !== "number" ||
    !Number.isFinite(entry.createdAt)
  ) return undefined;

  const name = normalizeName(entry.name);
  if (!name) return undefined;
  return {
    id: String(entry.id),
    name,
    score: Math.max(0, Math.floor(entry.score)),
    createdAt: entry.createdAt,
  };
}

export function parseLeaderboard(value: unknown): LeaderboardEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeEntry)
    .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
    .slice(0, MAX_ENTRIES);
}

export function clearLegacyLeaderboard(
  storage: LegacyScoreStorage | undefined = typeof localStorage === "undefined"
    ? undefined
    : localStorage,
): void {
  try {
    storage?.removeItem(LEGACY_LEADERBOARD_KEY);
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

function nameKey(name: string): string {
  return normalizeName(name).toLocaleLowerCase("ko-KR");
}

export function getBestScoreForName(
  entries: LeaderboardEntry[],
  name: string,
): number {
  const key = nameKey(name);
  if (!key) return 0;
  return entries.reduce(
    (best, entry) => nameKey(entry.name) === key
      ? Math.max(best, entry.score)
      : best,
    0,
  );
}

export function getNameLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const bestByName = new Map<string, LeaderboardEntry>();
  for (const entry of entries) {
    const key = nameKey(entry.name);
    const current = bestByName.get(key);
    if (!current || entry.score > current.score) bestByName.set(key, entry);
  }
  return [...bestByName.values()].sort(
    (a, b) => b.score - a.score || a.createdAt - b.createdAt,
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function fetchLeaderboard(signal?: AbortSignal): Promise<LeaderboardEntry[]> {
  const response = await fetch("/api/leaderboard", {
    headers: { Accept: "application/json" },
    signal,
  });
  const body = await readJson(response);
  if (!response.ok) throw new Error("리더보드를 불러오지 못했습니다.");
  const entries = body && typeof body === "object"
    ? (body as { entries?: unknown }).entries
    : undefined;
  return parseLeaderboard(entries);
}

export async function recordLeaderboardScore(
  score: { name: string; score: number },
): Promise<RecordedScore> {
  const response = await fetch("/api/leaderboard", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: normalizeName(score.name),
      score: Math.max(0, Math.floor(score.score)),
    }),
  });
  const body = await readJson(response);
  if (!response.ok || !body || typeof body !== "object") {
    throw new Error("점수를 저장하지 못했습니다.");
  }
  const payload = body as { entry?: unknown; isNewBest?: unknown };
  const entry = normalizeEntry(payload.entry);
  if (!entry || typeof payload.isNewBest !== "boolean") {
    throw new Error("점수 저장 응답이 올바르지 않습니다.");
  }
  return { entry, isNewBest: payload.isNewBest };
}

export async function resetLeaderboard(password: string): Promise<number> {
  const response = await fetch("/api/leaderboard", {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ confirmation: "리더보드 초기화", password }),
  });
  const body = await readJson(response);
  const deleted = body && typeof body === "object"
    ? (body as { deleted?: unknown }).deleted
    : undefined;
  if (response.status === 401) throw new Error("비밀번호가 올바르지 않습니다.");
  if (!response.ok || typeof deleted !== "number") {
    throw new Error("리더보드를 초기화하지 못했습니다.");
  }
  return Math.max(0, Math.floor(deleted));
}
