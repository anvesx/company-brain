export function escapeFts(input: string): string {
  return input
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((token) => `"${token.replaceAll('"', '""')}"`)
    .join(" ");
}
