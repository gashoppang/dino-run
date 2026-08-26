export type PlayerId = "1p" | "2p";

export interface LeaderboardEntry {
  id: string;
  studentId: string;
  name: string;
  player: PlayerId;
  score: number;
  createdAt: number;
}

interface ScoreStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const LEADERBOARD_KEY = "dino-run:leaderboard:v1";
export const LEADERBOARD_UPDATED_EVENT = "dino-run:leaderboard-updated";
const MAX_ENTRIES = 100;
const MAX_STUDENT_ID_LENGTH = 16;
const MAX_NAME_LENGTH = 12;

export function normalizeStudentId(value: string): string {
  return Array.from(value.trim().replace(/\s+/g, ""))
    .slice(0, MAX_STUDENT_ID_LENGTH)
    .join("");
}

export function normalizeName(value: string): string {
  return Array.from(value.trim().replace(/\s+/g, " "))
    .slice(0, MAX_NAME_LENGTH)
    .join("");
}

function normalizeEntry(value: unknown): LeaderboardEntry | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entry = value as Partial<LeaderboardEntry> & { nickname?: unknown };
  if (
    typeof entry.id !== "string" ||
    (entry.player !== "1p" && entry.player !== "2p") ||
    typeof entry.score !== "number" ||
    !Number.isFinite(entry.score) ||
    typeof entry.createdAt !== "number" ||
    !Number.isFinite(entry.createdAt)
  ) return undefined;

  const studentId = typeof entry.studentId === "string"
    ? normalizeStudentId(entry.studentId)
    : "";
  const name = typeof entry.name === "string"
    ? normalizeName(entry.name)
    : typeof entry.nickname === "string"
      ? normalizeName(entry.nickname)
      : "";
  if (!name) return undefined;

  return {
    id: entry.id,
    studentId,
    name,
    player: entry.player,
    score: Math.max(0, Math.floor(entry.score)),
    createdAt: entry.createdAt,
  };
}

export function parseLeaderboard(raw: string | null): LeaderboardEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeEntry)
      .filter((entry): entry is LeaderboardEntry => Boolean(entry))
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

function studentKey(studentId: string, name = ""): string {
  const normalizedStudentId = normalizeStudentId(studentId).toLocaleLowerCase("ko-KR");
  const normalizedName = normalizeName(name).toLocaleLowerCase("ko-KR");
  return normalizedStudentId || (normalizedName ? `legacy:${normalizedName}` : "");
}

export function getBestScoreForStudent(
  entries: LeaderboardEntry[],
  studentId: string,
): number {
  const key = studentKey(studentId);
  if (!key) return 0;
  return entries.reduce(
    (best, entry) => studentKey(entry.studentId, entry.name) === key
      ? Math.max(best, entry.score)
      : best,
    0,
  );
}

export function getStudentLeaderboard(
  entries: LeaderboardEntry[],
): LeaderboardEntry[] {
  const bestByStudent = new Map<string, LeaderboardEntry>();
  for (const entry of entries) {
    const key = studentKey(entry.studentId, entry.name);
    const current = bestByStudent.get(key);
    if (!current || entry.score > current.score) bestByStudent.set(key, entry);
  }
  return [...bestByStudent.values()].sort(
    (a, b) => b.score - a.score || a.createdAt - b.createdAt,
  );
}

export function recordLeaderboardScore(
  entry: Omit<LeaderboardEntry, "id" | "createdAt">,
  storage: ScoreStorage = localStorage,
  now = Date.now(),
): LeaderboardEntry[] {
  const studentId = normalizeStudentId(entry.studentId);
  const name = normalizeName(entry.name);
  if (!studentId || !name) return readLeaderboard(storage);

  const nextEntry: LeaderboardEntry = {
    id: `${now}-${entry.player}-${Math.random().toString(36).slice(2, 9)}`,
    studentId,
    name,
    player: entry.player,
    score: Math.max(0, Math.floor(entry.score)),
    createdAt: now,
  };
  const entries = [...readLeaderboard(storage), nextEntry]
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
    .slice(0, MAX_ENTRIES);
  try {
    storage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(LEADERBOARD_UPDATED_EVENT));
    }
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
  return entries;
}
