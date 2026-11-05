# account

Rule 1 and the email and password half of rule 13, through `POST /api/auth/sign-up/email`.

- `signup.test.ts`: the user, the personal organization named after the user, the active
  organization on the new session, the owner membership, and email field errors.
- `password.test.ts`: 12 to 128 characters counted as code points, the bundled breached list,
  and no other shape rule.
