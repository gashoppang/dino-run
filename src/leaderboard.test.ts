import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LEGACY_LEADERBOARD_KEY,
  clearLegacyLeaderboard,
  fetchLeaderboard,
  getBestScoreForStudent,
  getStudentLeaderboard,
  normalizeName,
  normalizeStudentId,
  parseLeaderboard,
  recordLeaderboardScore,
  resetLeaderboard,
} from "./leaderboard";

const entries = [
  { id: "1", studentId: "202402", name: "느린공룡", score: 20, createdAt: 2 },
  { id: "2", studentId: "202401", name: "빠른공룡", score: 80, createdAt: 3 },
];

afterEach(() => vi.unstubAllGlobals());

describe("leaderboard", () => {
  it("normalizes student IDs and names", () => {
    expect(normalizeStudentId("  20  2401  ")).toBe("202401");
    expect(normalizeName("  홍   길동  ")).toBe("홍 길동");
    expect(Array.from(normalizeName("123456789012345")).length).toBe(12);
  });

  it("normalizes and sorts API records", () => {
    expect(parseLeaderboard(entries).map(({ studentId, score }) => ({ studentId, score })))
      .toEqual([
        { studentId: "202401", score: 80 },
        { studentId: "202402", score: 20 },
      ]);
    expect(parseLeaderboard([{ name: "공룡" }])).toEqual([]);
  });

  it("keeps one personal best per student ID", () => {
    const duplicated = [
      ...entries,
      { id: "3", studentId: "202401", name: "빠른공룡", score: 90, createdAt: 4 },
    ];
    expect(getBestScoreForStudent(duplicated, "202401")).toBe(90);
    expect(getStudentLeaderboard(duplicated)).toHaveLength(2);
    expect(getStudentLeaderboard(duplicated)[0]?.score).toBe(90);
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
    expect(fetch).toHaveBeenCalledWith("/api/leaderboard", expect.any(Object));
  });

  it("posts normalized scores to the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ entry: entries[1], isNewBest: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )));
    await expect(recordLeaderboardScore({
      studentId: " 202401 ",
      name: " 빠른   공룡 ",
      score: 80.9,
    })).resolves.toEqual({ entry: entries[1], isNewBest: true });
    expect(fetch).toHaveBeenCalledWith("/api/leaderboard", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ studentId: "202401", name: "빠른 공룡", score: 80 }),
    }));
  });

  it("resets the server leaderboard with an explicit confirmation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ deleted: 7 }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )));
    await expect(resetLeaderboard("test-password")).resolves.toBe(7);
    expect(fetch).toHaveBeenCalledWith("/api/leaderboard", expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({
        confirmation: "리더보드 초기화",
        password: "test-password",
      }),
    }));
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
