/**
 * Table component.
 */

import type { FC, PropsWithChildren } from "hono/jsx";

/** Table wrapper. */
export const Table: FC<PropsWithChildren> = ({ children }) => <table class="table">{children}</table>;

/** Table header cell. */
export const TableHeader: FC<PropsWithChildren<{ scope?: "col" | "row" }>> = ({ scope = "col", children }) => <th scope={scope}>{children}</th>;

/** Table row. */
export const TableRow: FC<PropsWithChildren> = ({ children }) => <tr>{children}</tr>;

/** Table cell. */
export const TableCell: FC<PropsWithChildren> = ({ children }) => <td>{children}</td>;
