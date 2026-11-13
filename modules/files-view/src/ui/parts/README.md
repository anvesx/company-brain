# ui/parts

Reusable pieces: `paths.tsx` (cluster path chips with why),
`filters.tsx` (GET search and filter form), `table.tsx` (file table, cluster path chips, pager),
`states.tsx` (empty, error, removed). No client JavaScript: filters are a plain GET form and sort
headers are links, so every state is a URL and works with keyboard and screen readers.
