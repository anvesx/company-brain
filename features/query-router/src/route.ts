import { hasGraphSignal, hasRagSignal, needsNoRetrieval, truncateQuestion } from "./signals.js";
import { mentionedSources, selectSources } from "./sources.js";

export type Route = { mode: "none" } | { mode: "graph" | "rag" | "both"; sources: string[]; depth: "single" | "multi" };

export type RouteContext = { sources: string[]; hasGraph: boolean; hasRag: boolean };
type RetrievalMode = "graph" | "rag" | "both";

function availableMode(mode: RetrievalMode, context: RouteContext): RetrievalMode | "none" {
  if (mode === "both") {
    if (context.hasGraph && context.hasRag) return "both";
    if (context.hasGraph) return "graph";
    if (context.hasRag) return "rag";
    return "none";
  }
  if (mode === "graph") {
    if (context.hasGraph) return "graph";
    return context.hasRag ? "rag" : "none";
  }
  if (context.hasRag) return "rag";
  return context.hasGraph ? "graph" : "none";
}

function requestedMode(question: string): { mode: RetrievalMode; depth: "single" | "multi" } {
  const graph = hasGraphSignal(question);
  const rag = hasRagSignal(question);
  if ((graph && rag) || mentionedSources(question).length >= 2) {
    return { mode: "both", depth: "multi" };
  }
  if (graph) return { mode: "graph", depth: "single" };
  return { mode: "rag", depth: "single" };
}

export function route(question: string, context: RouteContext): Route {
  const bounded = truncateQuestion(question);
  if (needsNoRetrieval(bounded)) return { mode: "none" };
  const requested = requestedMode(bounded);
  const mode = availableMode(requested.mode, context);
  if (mode === "none") return { mode: "none" };
  return {
    mode,
    sources: selectSources(bounded, context.sources),
    depth: requested.depth,
  };
}
