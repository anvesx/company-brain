/**
 * Status chip and flash message.
 */

import type { FC, PropsWithChildren } from "hono/jsx";

export interface ChipProps {
  /** Status colour. Text always names the state too. */
  variant?: "ok" | "warn" | "off";
}

/** Small uppercase status label. */
export const Chip: FC<PropsWithChildren<ChipProps>> = ({ variant, children }) => <span class={variant ? `chip ${variant}` : "chip"}>{children}</span>;

export interface FlashProps {
  /** Error styling and role="alert". */
  bad?: boolean;
}

/** Inline notice. Errors announce as alerts, success as status. */
export const Flash: FC<PropsWithChildren<FlashProps>> = ({ bad, children }) => (
  <div class={bad ? "flash bad" : "flash"} role={bad ? "alert" : "status"}>
    {children}
  </div>
);
