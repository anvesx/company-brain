/**
 * Main content wrapper with skip link target.
 */

import type { FC, PropsWithChildren } from "hono/jsx";

export interface MainProps {
  /** Wide layout (960px instead of 720px). */
  wide?: boolean;
}

/** Main content wrapper. */
export const Main: FC<PropsWithChildren<MainProps>> = ({ wide, children }) => (
  <main id="main" class={wide ? "wide" : undefined}>
    {children}
  </main>
);
