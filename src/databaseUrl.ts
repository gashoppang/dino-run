export function prepareDatabaseUrl(value: string): string {
  const url = new URL(value);
  url.searchParams.delete("sslrootcert");
  return url.toString();
}
