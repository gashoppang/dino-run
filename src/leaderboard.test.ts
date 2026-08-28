import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LEGACY_LEADERBOARD_KEY,
  clearLegacyLeaderboard,
  fetchLeaderboard,
  getBestScoreForName,
  getNameLeaderboard,
  normalizeName,
  parseLeaderboard,
  recordLeaderboardScore,
  resetLeaderboard,
} from "./leaderboard";

const entries = [
  { id: "1", name: "느린공룡", score: 20, createdAt: 2 },
  { id: "2", name: "빠른공룡", score: 80, createdAt: 3 },
];

afterEach(() => vi.unstubAllGlobals());

describe("leaderboard", () => {
  it("normalizes names", () => {
    expect(normalizeName("  홍   길동  ")).toBe("홍 길동");
    expect(Array.from(normalizeName("123456789012345")).length).toBe(12);
  });

  it("normalizes and sorts API records without student IDs", () => {
    expect(parseLeaderboard(entries).map(({ name, score }) => ({ name, score })))
      .toEqual([
        { name: "빠른공룡", score: 80 },
        { name: "느린공룡", score: 20 },
      ]);
    expect(parseLeaderboard([{ name: "공룡" }])).toEqual([]);
  });

  it("keeps one personal best per normalized name", () => {
    const duplicated = [
      ...entries,
      { id: "3", name: "빠른공룡", score: 90, createdAt: 4 },
    ];
    expect(getBestScoreForName(duplicated, "빠른공룡")).toBe(90);
    expect(getNameLeaderboard(duplicated)).toHaveLength(2);
    expect(getNameLeaderboard(duplicated)[0]?.score).toBe(90);
  });

  it("deletes the legacy browser leaderboard", () => {
    const removeItem = vi.fn();
    clearLegacyLeaderboard({ removeItem });
    expect(removeItem).toHaveBeenCalledWith(LEGACY_LEADERBOARD_KEY);
  });

  it("loads leaderboard records from the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ entries }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )));
    await expect(fetchLeaderboard()).resolves.toEqual([entries[1], entries[0]]);
  });

  it("posts normalized name scores to the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ entry: entries[1], isNewBest: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )));
    await expect(recordLeaderboardScore({ name: " 빠른   공룡 ", score: 80.9 }))
      .resolves.toEqual({ entry: entries[1], isNewBest: true });
    expect(fetch).toHaveBeenCalledWith("/api/leaderboard", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "빠른 공룡", score: 80 }),
    }));
  });

  it("resets the server leaderboard with a password", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ deleted: 7 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )));
    await expect(resetLeaderboard("test-password")).resolves.toBe(7);
  });

  it("reports an incorrect reset password", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "비밀번호가 올바르지 않습니다." }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )));
    await expect(resetLeaderboard("wrong"))
      .rejects.toThrow("비밀번호가 올바르지 않습니다.");
  });
});
