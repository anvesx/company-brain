/**
 * Tile component for connector cards.
 */

import type { FC, PropsWithChildren } from "hono/jsx";

export interface TileProps {
  /** Needs authentication state. */
  needsAuth?: boolean;
  /** Not configured state. */
  off?: boolean;
  /** Form action. */
  action?: string;
}

/** Tile card. */
export const Tile: FC<PropsWithChildren<TileProps>> = ({ needsAuth, off, action, children }) => {
  const classes = ["tile"];
  if (needsAuth) classes.push("needs-auth");
  if (off) classes.push("off");
  return (
    <form class={classes.join(" ")} action={action} method="post">
      {children}
    </form>
  );
};

/** Tile header with mark. */
export const TileHead: FC<PropsWithChildren> = ({ children }) => <div class="tile-head">{children}</div>;

/** Tile mark (icon or letter). */
export const TileMark: FC<PropsWithChildren> = ({ children }) => <div class="tile-mark">{children}</div>;
