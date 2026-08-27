import { describe, expect, it } from "vitest";
import { prepareDatabaseUrl } from "./databaseUrl";

describe("prepareDatabaseUrl", () => {
  it("removes the libpq-only root certificate option", () => {
    const result = prepareDatabaseUrl(
      "postgresql://user:secret@example.com:5432/postgres?sslmode=verify-full&sslrootcert=system",
    );
    const url = new URL(result);
    expect(url.searchParams.get("sslmode")).toBe("verify-full");
    expect(url.searchParams.has("sslrootcert")).toBe(false);
  });
});
