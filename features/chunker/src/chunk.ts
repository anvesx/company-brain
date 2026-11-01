import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { chunkId } from "./ids.js";
import { ChunkError } from "./errors.js";
import { locate } from "./offsets.js";

export type Chunk = { id: string; docId: string; index: number; text: string; start: number; end: number };
export type ChunkOptions = { size?: number; overlap?: number };

const DEFAULT_SIZE = 1000;
const DEFAULT_OVERLAP = 100;

/** The library splits on "" by UTF-16 unit, which can cut a surrogate pair. Split by code point instead. */
class CodePointSplitter extends RecursiveCharacterTextSplitter {
  protected override splitOnSeparator(text: string, separator: string): string[] {
    return separator === "" ? [...text] : super.splitOnSeparator(text, separator);
  }
}

function resolve(docId: unknown, text: unknown, opt: ChunkOptions): { size: number; overlap: number } {
  const size = opt.size ?? DEFAULT_SIZE;
  const overlap = opt.overlap ?? DEFAULT_OVERLAP;
  if (typeof docId !== "string") throw new ChunkError("BAD_OPTIONS", "docId must be a string");
  if (typeof text !== "string") throw new ChunkError("BAD_OPTIONS", "text must be a string");
  if (!Number.isInteger(size) || size < 1) throw new ChunkError("BAD_OPTIONS", "size must be an integer >= 1");
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= size) {
    throw new ChunkError("BAD_OPTIONS", "overlap must be an integer in [0, size)");
  }
  return { size, overlap };
}

/** Splits text into overlapping chunks with stable ids and verified offsets. */
export async function chunkText(docId: string, text: string, opt: ChunkOptions = {}): Promise<Chunk[]> {
  const { size, overlap } = resolve(docId, text, opt);
  if (text.trim() === "") return [];
  const splitter = new CodePointSplitter({ chunkSize: size, chunkOverlap: overlap });
  const pieces = await splitter.splitText(text);
  return locate(text, pieces).map((hit, index) => ({
    id: chunkId(docId, index, hit.text),
    docId,
    index,
    text: hit.text,
    start: hit.start,
    end: hit.end,
  }));
}
