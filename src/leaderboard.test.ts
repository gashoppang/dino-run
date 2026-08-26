import { describe, expect, it } from "vitest";
import {
  LEADERBOARD_KEY,
  getBestScoreForStudent,
  getStudentLeaderboard,
  normalizeName,
  normalizeStudentId,
  parseLeaderboard,
  recordLeaderboardScore,
} from "./leaderboard";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

describe("leaderboard storage", () => {
  it("normalizes student IDs and names", () => {
    expect(normalizeStudentId("  20  2401  ")).toBe("202401");
    expect(normalizeName("  홍   길동  ")).toBe("홍 길동");
    expect(Array.from(normalizeName("123456789012345")).length).toBe(12);
  });

  it("records student scores in descending order", () => {
    const storage = createStorage();
    recordLeaderboardScore(
      { studentId: "202402", name: "느린공룡", player: "1p", score: 20 },
      storage,
      2,
    );
    const entries = recordLeaderboardScore(
      { studentId: "202401", name: "빠른공룡", player: "2p", score: 80 },
      storage,
      3,
    );

    expect(entries.map(({ studentId, name, score }) => ({ studentId, name, score }))).toEqual([
      { studentId: "202401", name: "빠른공룡", score: 80 },
      { studentId: "202402", name: "느린공룡", score: 20 },
    ]);
    expect(parseLeaderboard(storage.getItem(LEADERBOARD_KEY))).toHaveLength(2);
  });

  it("ignores corrupt stored records", () => {
    expect(parseLeaderboard("not-json")).toEqual([]);
    expect(parseLeaderboard('[{"name":"공룡"}]')).toEqual([]);
  });

  it("shares one personal best across 1P and 2P for the same student ID", () => {
    const storage = createStorage();
    recordLeaderboardScore(
      { studentId: "202401", name: "홍길동", player: "1p", score: 40 },
      storage,
      1,
    );
    const entries = recordLeaderboardScore(
      { studentId: "202401", name: "홍길동", player: "2p", score: 90 },
      storage,
      2,
    );

    expect(getBestScoreForStudent(entries, "202401")).toBe(90);
    expect(getStudentLeaderboard(entries)).toHaveLength(1);
    expect(getStudentLeaderboard(entries)[0]?.player).toBe("2p");
  });

  it("keeps legacy nickname records as previous records", () => {
    const storage = createStorage();
    storage.setItem(
      LEADERBOARD_KEY,
      '[{"id":"old","nickname":"공룡","player":"1p","score":30,"createdAt":1}]',
    );
    const entries = recordLeaderboardScore(
      { studentId: "202401", name: "홍길동", player: "2p", score: 50 },
      storage,
      2,
    );
    expect(entries.find(({ studentId }) => !studentId))
      .toMatchObject({ studentId: "", name: "공룡", score: 30 });
    expect(parseLeaderboard(storage.getItem(LEADERBOARD_KEY))).toHaveLength(2);
  });
});
