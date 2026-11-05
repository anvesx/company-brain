# property

fast-check properties. Seeds are printed by fast-check on failure; rerun with that seed.

- `install.test.ts`: rules 10, 13, 14: any valid manifest renders a body that parses back to
  its url; any invalid name is BAD_INPUT; rendering is pure.
- `port.test.ts`: rules 8, 13: `require` on arbitrary headers either returns a caller or throws
  an `IdentityError`, never anything else.
- `redirect.test.ts`: spec property 1: any redirect not equal to the registered one is rejected
  without a redirect.
- `claims.test.ts`: spec property 2: a token with any single claim altered fails verification.
