/** Public browser-facing origin (OAuth callbacks, share links). */
export function publicAppUrl(): string {
  return (
    process.env.NEXTAUTH_PUBLIC_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3456"
  );
}
