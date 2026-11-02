import { expect } from "vitest";
import { SyncError } from "../src/index.js";
import { put, type setup } from "./helpers.js";

/** Awaits `p`, asserts it threw a SyncError, and returns its code ("none" when it did not throw). */
export const code = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(SyncError);
    return (e as SyncError).code;
  }
  return "none";
};

/** `n` documents d0.txt.. each readable by one user. */
export const seed = (s: ReturnType<typeof setup>, n: number): void => {
  for (let i = 0; i < n; i++) put(s.root, `d${i}.txt`, [`u${i}`]);
};
