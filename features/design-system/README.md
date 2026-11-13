# Design system

Server-rendered components and design tokens for Company Brain, built with
hono/jsx. Follows the DevX Doctrine: paper and ink, one accent, type-led
hierarchy, no decoration.

## Tokens

Colors, typography and spacing in `src/tokens`:

- Light palette for normal pages, and a dark theme through `prefers-color-scheme`
- Dark palette forced on the graph page (`<Document dark>`)
- WCAG AA contrast ratios computed in tests with culori
- CSS custom properties generated from the token objects

## Components

All components are server-rendered JSX with no client-side JavaScript required:

- **Layout**: Document, Main, SkipLink
- **Typography**: Heading, Paragraph, Link, Eyebrow
- **Forms**: FormField, Button, ProviderButton
- **Feedback**: Flash, Chip
- **Data**: Tile, Table

## Accessibility

- Focus rings on all interactive elements
- Skip links for keyboard navigation
- Proper ARIA attributes
- Color contrast >= 4.5:1 for text, >= 3:1 for non-text
- No color-only state indicators

## Usage

```tsx
import { Document, Main, Heading, Button } from "@anvesx/design-system";

const page = (
  <Document title="Sign in">
    <Main>
      <Heading>Sign in</Heading>
      <Button type="submit">Continue</Button>
    </Main>
  </Document>
);
```

## Tests

- `contrast.test.ts`: computed WCAG ratios for every text, border and node pair, light and dark
- `tokens.test.ts`: token shape and generated CSS
- `content.test.ts`, `interactive.test.ts`: server-rendered HTML of every component

Run `pnpm test` in this folder (coverage on, threshold 90).
