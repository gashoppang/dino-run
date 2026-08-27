import postgres from "postgres";

const MAX_NAME_LENGTH = 12;
const MAX_SCORE = 1_000_000_000;

type Sql = ReturnType<typeof postgres>;

interface ScoreRow {
  id: string;
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

function normalizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return Array.from(value.trim().replace(/\s+/g, " "))
    .slice(0, MAX_NAME_LENGTH)
    .join("");
}

function nameKey(name: string): string {
  return name.toLocaleLowerCase("ko-KR");
}

function normalizeScore(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(MAX_SCORE, Math.max(0, Math.floor(value)));
}

function serializeRow(row: ScoreRow) {
  return {
    id: String(row.id),
    studentId: row.name,
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

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function GET(): Promise<Response> {
  try {
    const database = getSql();
    const rows = await database<ScoreRow[]>`
      SELECT id, name, score, updated_at AS created_at
      FROM leaderboard_scores
      ORDER BY score DESC, updated_at ASC
      LIMIT 100
    `;
    return json({ entries: rows.map(serializeRow) });
  } catch (error) {
    console.error("Leaderboard API error", error);
    return json({ error: "리더보드 서버에 연결하지 못했습니다." }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readBody(request);
    const name = normalizeName(body?.name);
    const score = normalizeScore(body?.score);
    if (!name || score === undefined) {
      return json({ error: "이름과 점수를 확인하세요." }, 400);
    }
    const playerKey = nameKey(name);

    const database = getSql();
    const saved = await database.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(hashtext(${playerKey}))`;
      const previousRows = await transaction<{ score: number }[]>`
        SELECT score FROM leaderboard_scores WHERE student_id = ${playerKey}
      `;
      const previousBest = previousRows[0]?.score ?? 0;
      const rows = await transaction<ScoreRow[]>`
        INSERT INTO leaderboard_scores (student_id, name, score)
        VALUES (${playerKey}, ${name}, ${score})
        ON CONFLICT (student_id) DO UPDATE SET
          name = EXCLUDED.name,
          score = GREATEST(leaderboard_scores.score, EXCLUDED.score),
          updated_at = CASE
            WHEN EXCLUDED.score > leaderboard_scores.score THEN NOW()
            ELSE leaderboard_scores.updated_at
          END
        RETURNING id, name, score, updated_at AS created_at
      `;
      return { row: rows[0], isNewBest: score > previousBest };
    });
    if (!saved.row) throw new Error("Saved score was not returned");
    return json({ entry: serializeRow(saved.row), isNewBest: saved.isNewBest });
  } catch (error) {
    console.error("Leaderboard API error", error);
    return json({ error: "리더보드 서버에 연결하지 못했습니다." }, 503);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    if (!isSameOrigin(request)) {
      return json({ error: "허용되지 않은 복구 요청입니다." }, 403);
    }
    const body = await readBody(request);
    const resetPassword = process.env.LEADERBOARD_RESET_PASSWORD;
    if (!resetPassword || body?.password !== resetPassword) {
      return json({ error: "비밀번호가 올바르지 않습니다." }, 401);
    }
    if (body?.action !== "migrate-to-name") {
      return json({ error: "지원하지 않는 복구 요청입니다." }, 400);
    }

    const database = getSql();
    const migrated = await database.begin(async (transaction) => {
      await transaction`
        WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY LOWER(name)
            ORDER BY score DESC, updated_at ASC, id ASC
          ) AS rank
          FROM leaderboard_scores
        )
        DELETE FROM leaderboard_scores AS scores
        USING ranked
        WHERE scores.id = ranked.id AND ranked.rank > 1
      `;
      return transaction<{ id: string }[]>`
        UPDATE leaderboard_scores
        SET student_id = LOWER(name)
        RETURNING id
      `;
    });
    return json({ migrated: migrated.length });
  } catch (error) {
    console.error("Leaderboard migration error", error);
    return json({ error: "리더보드 기록을 복구하지 못했습니다." }, 503);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    if (!isSameOrigin(request)) {
      return json({ error: "허용되지 않은 초기화 요청입니다." }, 403);
    }
    const body = await readBody(request);
    if (body?.confirmation !== "리더보드 초기화") {
      return json({ error: "초기화 확인이 필요합니다." }, 400);
    }
    const resetPassword = process.env.LEADERBOARD_RESET_PASSWORD;
    if (!resetPassword) {
      return json({ error: "초기화 비밀번호가 설정되지 않았습니다." }, 503);
    }
    if (body.password !== resetPassword) {
      return json({ error: "비밀번호가 올바르지 않습니다." }, 401);
    }
    const database = getSql();
    const deletedRows = await database<{ id: string }[]>`
      DELETE FROM leaderboard_scores RETURNING id
    `;
    return json({ deleted: deletedRows.length });
  } catch (error) {
    console.error("Leaderboard API error", error);
    return json({ error: "리더보드를 초기화하지 못했습니다." }, 503);
  }
}
