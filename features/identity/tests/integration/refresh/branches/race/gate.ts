import { beforeEach } from "vitest";
import type { Adapter, Provider } from "../kit.js";

export const refusedOnce = { value: false };
/** After the refusal, every read of the row is followed by `act`, as if another process wrote in between. */
export const racing =
  (act: (id: string) => void): ((real: Adapter) => unknown) =>
  (real) => ({
    ...real,
    findOne: async (args: Parameters<typeof real.findOne>[0]) => {
      const row = await real.findOne(args);
      if (refusedOnce.value && args.model === "account") act(String((row as { id?: string } | null)?.id ?? ""));
      return row;
    },
  });
export const refuse = (): Provider => ({
  id: "replay",
  refreshAccessToken: async () => {
    refusedOnce.value = true;
    throw { status: 400 };
  },
});
/** Each test starts before any refusal has happened. */
export const resetRefusal = () =>
  beforeEach(() => {
    refusedOnce.value = false;
  });
