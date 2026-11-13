/**
 * Button component with variants.
 */

import type { FC, PropsWithChildren } from "hono/jsx";

export interface ButtonProps {
  /** Secondary button (outlined). */
  secondary?: boolean;
  /** Destructive action. */
  danger?: boolean;
  /** Link-style button. */
  link?: boolean;
  /** Disabled state. */
  disabled?: boolean;
  /** Button type. */
  type?: "button" | "submit" | "reset";
}

/** Button with variants. */
export const Button: FC<PropsWithChildren<ButtonProps>> = ({ secondary, danger, link, disabled, type = "button", children }) => {
  const classes = ["btn"];
  if (secondary) classes.push("btn-2");
  if (danger) classes.push("btn-danger");
  if (link) classes.push("btn-link");
  return (
    <button class={classes.join(" ")} type={type} disabled={disabled}>
      {children}
    </button>
  );
};
