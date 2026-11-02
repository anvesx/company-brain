const SOURCE_NAMES = ["slack", "github", "drive", "jira", "notion"] as const;

export function mentionedSources(question: string): string[] {
  const lower = question.toLocaleLowerCase("en-US");
  return SOURCE_NAMES.filter((source) => {
    const pattern = new RegExp(`\\b${source}\\b`, "u");
    return pattern.test(lower);
  });
}

export function selectSources(question: string, connected: string[]): string[] {
  const unique = [...new Set(connected)];
  const mentioned = mentionedSources(question);
  if (mentioned.length === 0) return unique;
  return unique.filter((source) => mentioned.includes(source.toLocaleLowerCase("en-US")));
}
