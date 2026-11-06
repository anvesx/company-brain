# policy

Password and email rules for sign-up. Hashing is not here: better-auth's own scrypt default is used.

- `password.ts`: `checkPassword` (12 to 128 code points, not on the breached list), `checkEmail`.
- `breached.txt`: one lowercase breached password per line; `regen.mjs` rebuilds it.

## Source of the list

`breached.txt` is the first 10,000 unique entries of the frequency-ranked `dictionary.passwords`
array in `@zxcvbn-ts/language-common` 3.0.4 (MIT), a dev dependency, lowercased and in original
order. `regen.mjs` rebuilds it (`node src/policy/regen.mjs`) and fails if fewer than 10,000 unique
entries are found. No entry was invented.
