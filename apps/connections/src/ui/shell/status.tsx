import { Flash } from "@anvesx/design-system";
import type { State } from "../model/state.js";

/** A dot and the state in words: colour is never the only signal. */
export const Status = ({ state }: { state: State }) => <span class={`st ${state.tone}`}>{state.label}</span>;

export type Note = { kind: "ok" | "bad"; text: string };

/** The line after a redirect: what was done, or why it was not. */
export const Notice = ({ note }: { note?: Note | undefined }) => (note ? <Flash bad={note.kind === "bad"}>{note.text}</Flash> : null);
