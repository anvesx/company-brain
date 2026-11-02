const GRAPH_SIGNALS = [
  /\bwho\b/i,
  /\bwhich\s+team\b/i,
  /\bpeople\b|\bperson\b/i,
  /\bowners?\b|\bowns?\b|\bownership\b|\bowned\s+by\b/i,
  /\bmembers?\b|\bmembership\b|\bbelongs?\s+to\b/i,
  /\blinked\s+to\b/i,
];

const RAG_SIGNALS = [/["“][^"”]+["”]/u, /\bwhat\s+does\b/i, /\bsummari[sz](?:e|ed|ing)\b/i, /\bfind\s+the\s+doc(?:ument)?\s+about\b/i, /\bquote\b/i];

const NO_RETRIEVAL = [
  /^(?:hi|hello|hey)(?:\s+there)?[!,.?]*$/i,
  /^good\s+(?:morning|afternoon|evening)[!,.?]*$/i,
  /^(?:thanks|thank\s+you)(?:\s+very\s+much)?[!,.?]*$/i,
];

export function hasGraphSignal(question: string): boolean {
  return GRAPH_SIGNALS.some((pattern) => pattern.test(question));
}

export function hasRagSignal(question: string): boolean {
  return RAG_SIGNALS.some((pattern) => pattern.test(question));
}

export function needsNoRetrieval(question: string): boolean {
  const trimmed = question.trim();
  return trimmed.length === 0 || NO_RETRIEVAL.some((pattern) => pattern.test(trimmed));
}

export function truncateQuestion(question: string): string {
  if (typeof question !== "string") return "";
  const bytes = new TextEncoder().encode(question);
  if (bytes.length <= 4096) return question;
  let end = 4096;
  while ((bytes[end] ?? 0) >> 6 === 2) end -= 1;
  return new TextDecoder().decode(bytes.subarray(0, end));
}
