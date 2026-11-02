import { describe, expect, it } from "vitest";
import { hasGraphSignal, hasRagSignal, needsNoRetrieval } from "../../../src/signals.js";

describe("signal boundaries", () => {
  it.each(["which   team", "owned   by platform", "I own this", "one member", "I belong to search", "linked   to Atlas"])(
    "accepts graph phrase %s",
    (question) => expect(hasGraphSignal(question)).toBe(true),
  );

  it.each(["“x”", "“alpha beta”", "what   does this say", "find   the   doc   about launch"])("accepts RAG phrase %s", (question) =>
    expect(hasRagSignal(question)).toBe(true),
  );

  it.each(['alpha beta"', "“””", "show a roadmap"])("rejects RAG near miss %s", (question) => expect(hasRagSignal(question)).toBe(false));

  it.each(["hi  there", "good   morning", "thank   you", "thank you   very   much"])("accepts conversational phrase %s", (question) =>
    expect(needsNoRetrieval(question)).toBe(true),
  );

  it.each(["say hi", "hi then answer", "say good morning", "good morning team", "say thanks", "thanks for the document"])(
    "rejects conversational near miss %s",
    (question) => expect(needsNoRetrieval(question)).toBe(false),
  );
});
