# Paging

- `paging.ts`: `pageItems` slices a listing; it accepts only canonical cursor offsets and limits from 1 through 1000.
- `walks.ts`: keys each folder walk by an opaque cursor `<walkId>:<offset>`, keeps at most 16 open walks (oldest evicted) and drops a walk after its last page.

Both throw `ConnectorError` (from `../contract.ts`) for malformed cursors and limits.
