export type PlayerId = "1p" | "2p";

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  player: PlayerId;
  score: number;
  createdAt: number;
}

interface ScoreStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const LEADERBOARD_KEY = "dino-run:leaderboard:v1";
const MAX_ENTRIES = 100;
const MAX_NICKNAME_LENGTH = 12;

export function normalizeNickname(value: string): string {
  return Array.from(value.trim().replace(/\s+/g, " "))
    .slice(0, MAX_NICKNAME_LENGTH)
    .join("");
}

function isEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<LeaderboardEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.nickname === "string" &&
    normalizeNickname(entry.nickname).length > 0 &&
    (entry.player === "1p" || entry.player === "2p") &&
    typeof entry.score === "number" &&
    Number.isFinite(entry.score) &&
    typeof entry.createdAt === "number" &&
    Number.isFinite(entry.createdAt)
  );
}

export function parseLeaderboard(raw: string | null): LeaderboardEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isEntry)
      .map((entry) => ({
        ...entry,
        nickname: normalizeNickname(entry.nickname),
        score: Math.max(0, Math.floor(entry.score)),
      }))
      .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function readLeaderboard(storage: ScoreStorage = localStorage): LeaderboardEntry[] {
  try {
    return parseLeaderboard(storage.getItem(LEADERBOARD_KEY));
  } catch {
    return [];
  }
}

function nicknameKey(nickname: string): string {
  return normalizeNickname(nickname).toLocaleLowerCase("ko-KR");
}

export function getBestScoreForNickname(
  entries: LeaderboardEntry[],
  nickname: string,
): number {
  const key = nicknameKey(nickname);
  if (!key) return 0;
  return entries.reduce(
    (best, entry) => nicknameKey(entry.nickname) === key
      ? Math.max(best, entry.score)
      : best,
    0,
  );
}

export function getNicknameLeaderboard(
  entries: LeaderboardEntry[],
): LeaderboardEntry[] {
  const bestByNickname = new Map<string, LeaderboardEntry>();
  for (const entry of entries) {
    const key = nicknameKey(entry.nickname);
    const current = bestByNickname.get(key);
    if (!current || entry.score > current.score) bestByNickname.set(key, entry);
  }
  return [...bestByNickname.values()].sort(
    (a, b) => b.score - a.score || a.createdAt - b.createdAt,
  );
}

export function recordLeaderboardScore(
  entry: Omit<LeaderboardEntry, "id" | "createdAt">,
  storage: ScoreStorage = localStorage,
  now = Date.now(),
): LeaderboardEntry[] {
  const nickname = normalizeNickname(entry.nickname);
  if (!nickname) return readLeaderboard(storage);

  const nextEntry: LeaderboardEntry = {
    id: `${now}-${entry.player}-${Math.random().toString(36).slice(2, 9)}`,
    nickname,
    player: entry.player,
    score: Math.max(0, Math.floor(entry.score)),
    createdAt: now,
  };
  const entries = [...readLeaderboard(storage), nextEntry]
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
    .slice(0, MAX_ENTRIES);
  try {
    storage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
  return entries;
}
