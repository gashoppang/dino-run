import { describe, expect, it } from "vitest";
import {
  LEADERBOARD_KEY,
  getBestScoreForNickname,
  getNicknameLeaderboard,
  normalizeNickname,
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
  it("normalizes whitespace and limits nicknames", () => {
    expect(normalizeNickname("  달리는   공룡  ")).toBe("달리는 공룡");
    expect(Array.from(normalizeNickname("123456789012345")).length).toBe(12);
  });

  it("records nickname scores in descending order", () => {
    const storage = createStorage();
    recordLeaderboardScore({ nickname: "느린공룡", player: "1p", score: 20 }, storage, 2);
    const entries = recordLeaderboardScore(
      { nickname: "빠른공룡", player: "2p", score: 80 },
      storage,
      3,
    );

    expect(entries.map(({ nickname, player, score }) => ({ nickname, player, score }))).toEqual([
      { nickname: "빠른공룡", player: "2p", score: 80 },
      { nickname: "느린공룡", player: "1p", score: 20 },
    ]);
    expect(parseLeaderboard(storage.getItem(LEADERBOARD_KEY))).toHaveLength(2);
  });

  it("ignores corrupt stored records", () => {
    expect(parseLeaderboard("not-json")).toEqual([]);
    expect(parseLeaderboard('[{"nickname":"공룡"}]')).toEqual([]);
  });

  it("shares one personal best across 1P and 2P for the same nickname", () => {
    const storage = createStorage();
    recordLeaderboardScore({ nickname: "DINO", player: "1p", score: 40 }, storage, 1);
    const entries = recordLeaderboardScore(
      { nickname: "dino", player: "2p", score: 90 },
      storage,
      2,
    );

    expect(getBestScoreForNickname(entries, "Dino")).toBe(90);
    expect(getNicknameLeaderboard(entries)).toHaveLength(1);
    expect(getNicknameLeaderboard(entries)[0]?.player).toBe("2p");
  });
});
