import postgres from "postgres";

const MAX_STUDENT_ID_LENGTH = 16;
const MAX_NAME_LENGTH = 12;
const MAX_SCORE = 1_000_000_000;

type Sql = ReturnType<typeof postgres>;

interface ScoreRow {
  id: string;
  student_id: string;
  name: string;
  score: number;
  created_at: Date;
}

let sql: Sql | undefined;

function prepareDatabaseUrl(value: string): string {
  const url = new URL(value);
  url.searchParams.delete("sslrootcert");
  return url.toString();
}

function getSql(): Sql {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  sql ??= postgres(prepareDatabaseUrl(databaseUrl), {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return sql;
}

function normalizeStudentId(value: unknown): string {
  if (typeof value !== "string") return "";
  return Array.from(value.trim().replace(/\s+/g, ""))
    .slice(0, MAX_STUDENT_ID_LENGTH)
    .join("");
}

function normalizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return Array.from(value.trim().replace(/\s+/g, " "))
    .slice(0, MAX_NAME_LENGTH)
    .join("");
}

function normalizeScore(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(MAX_SCORE, Math.max(0, Math.floor(value)));
}

function serializeRow(row: ScoreRow) {
  return {
    id: String(row.id),
    studentId: row.student_id,
    name: row.name,
    score: row.score,
    createdAt: row.created_at.getTime(),
  };
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function readBody(request: Request): Promise<Record<string, unknown> | undefined> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? body as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

export default async function handler(request: Request): Promise<Response> {
  try {
    const database = getSql();

    if (request.method === "GET") {
      const rows = await database<ScoreRow[]>`
        SELECT id, student_id, name, score, updated_at AS created_at
        FROM leaderboard_scores
        ORDER BY score DESC, updated_at ASC
        LIMIT 100
      `;
      return json({ entries: rows.map(serializeRow) });
    }

    if (request.method === "POST") {
      const body = await readBody(request);
      const studentId = normalizeStudentId(body?.studentId);
      const name = normalizeName(body?.name);
      const score = normalizeScore(body?.score);
      if (!studentId || !name || score === undefined) {
        return json({ error: "학번, 이름, 점수를 확인하세요." }, 400);
      }

      const saved = await database.begin(async (transaction) => {
        await transaction`SELECT pg_advisory_xact_lock(hashtext(${studentId}))`;
        const previousRows = await transaction<{ score: number }[]>`
          SELECT score FROM leaderboard_scores WHERE student_id = ${studentId}
        `;
        const previousBest = previousRows[0]?.score ?? 0;
        const rows = await transaction<ScoreRow[]>`
          INSERT INTO leaderboard_scores (student_id, name, score)
          VALUES (${studentId}, ${name}, ${score})
          ON CONFLICT (student_id) DO UPDATE SET
            name = EXCLUDED.name,
            score = GREATEST(leaderboard_scores.score, EXCLUDED.score),
            updated_at = CASE
              WHEN EXCLUDED.score > leaderboard_scores.score THEN NOW()
              ELSE leaderboard_scores.updated_at
            END
          RETURNING id, student_id, name, score, updated_at AS created_at
        `;
        return { row: rows[0], isNewBest: score > previousBest };
      });
      if (!saved.row) throw new Error("Saved score was not returned");
      return json({ entry: serializeRow(saved.row), isNewBest: saved.isNewBest });
    }

    return json({ error: "지원하지 않는 요청입니다." }, 405);
  } catch (error) {
    console.error("Leaderboard API error", error);
    return json({ error: "리더보드 서버에 연결하지 못했습니다." }, 503);
  }
}
