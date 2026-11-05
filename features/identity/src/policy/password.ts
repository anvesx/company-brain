import { readFileSync } from "node:fs";
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import * as common from "@zxcvbn-ts/language-common";
import { IdentityError } from "../errors.js";

// zxcvbn gets the common dictionary and keyboard layouts, so patterns like qwerty or Password1234 score low.
zxcvbnOptions.setOptions({ dictionary: { ...common.dictionary }, graphs: common.adjacencyGraphs });

/** The weakest zxcvbn score (0 to 4) a password may have. 3 means "safely unguessable" in zxcvbn terms. */
const MIN_SCORE = 3;

/** The 10,000 most common passwords (see README.md in this folder for the source). One per line. */
export const breachedPasswords: ReadonlySet<string> = new Set(
  readFileSync(new URL("./breached.txt", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line !== ""),
);

const MIN = 12;
const MAX = 128;

/** Length is counted in code points, so one emoji is one character. Nothing else about shape is checked. */
export const checkPassword = (password: unknown): void => {
  if (typeof password !== "string") throw new IdentityError("BAD_INPUT", "must be a string", "password");
  const length = [...password].length;
  if (length < MIN || length > MAX) throw new IdentityError("BAD_INPUT", `must be ${MIN} to ${MAX} characters`, "password");
  // NFKC folds look-alike forms (full-width letters, ligatures) and lowercase folds case, so "PASSWORD1234" matches "password1234".
  if (breachedPasswords.has(password.normalize("NFKC").toLowerCase()))
    throw new IdentityError("BAD_INPUT", "appears in a list of common passwords", "password");
  if (zxcvbn(password.normalize("NFKC")).score < MIN_SCORE)
    throw new IdentityError("BAD_INPUT", "is too easy to guess: avoid common words, keyboard runs and repeats", "password");
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const checkEmail = (email: unknown): void => {
  if (typeof email !== "string" || !EMAIL.test(email)) throw new IdentityError("BAD_INPUT", "must be an email address", "email");
};
