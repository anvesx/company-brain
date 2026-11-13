/**
 * Heading components: h1, h2, h3.
 */

import type { FC, PropsWithChildren } from "hono/jsx";

export interface HeadingProps {
  /** Heading level (1, 2, or 3). */
  level?: 1 | 2 | 3;
  /** Italic serif accent for one word in h1. */
  accent?: string;
}

/** Page or section heading. */
export const Heading: FC<PropsWithChildren<HeadingProps>> = ({ level = 1, accent, children }) => {
  if (level === 1 && accent) {
    return (
      <h1>
        {children} <em>{accent}</em>
      </h1>
    );
  }
  const Tag = `h${level}` as const;
  return <Tag>{children}</Tag>;
};
