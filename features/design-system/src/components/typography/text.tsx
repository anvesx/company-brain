/**
 * Eyebrow, paragraph and link.
 */

import type { FC, PropsWithChildren } from "hono/jsx";

/** Small uppercase label above a title. */
export const Eyebrow: FC<PropsWithChildren> = ({ children }) => <small class="eyebrow">{children}</small>;

/** Body paragraph. */
export const Paragraph: FC<PropsWithChildren> = ({ children }) => <p>{children}</p>;

export interface LinkProps {
  /** Link target. */
  href: string;
}

/** Text link. */
export const Link: FC<PropsWithChildren<LinkProps>> = ({ href, children }) => <a href={href}>{children}</a>;
