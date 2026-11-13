/**
 * Document component: root HTML wrapper with head and body.
 */

import type { Child, FC, PropsWithChildren } from "hono/jsx";
import { styles } from "../styles.ts";

export interface DocumentProps {
  /** Page title. */
  title: string;
  /** Meta description. */
  description?: string;
  /** Additional head elements. */
  head?: Child;
  /** Use dark graph styles. */
  dark?: boolean;
}

/** Root HTML document. */
export const Document: FC<PropsWithChildren<DocumentProps>> = ({ title, description, head, dark, children }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Roboto:wght@500&family=Source+Serif+4:ital,opsz,wght@1,8..60,400&display=swap"
        rel="stylesheet"
      />
      {head}
      <style dangerouslySetInnerHTML={{ __html: styles }} />
    </head>
    <body class={dark ? "graph" : undefined}>{children}</body>
  </html>
);
