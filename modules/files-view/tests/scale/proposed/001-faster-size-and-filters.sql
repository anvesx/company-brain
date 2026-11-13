-- Proposal from the scale lane to the builder (not applied by src/db/migrate.ts). Idempotent; same results, less work.
-- 1) fv_num: 4.3x faster per call (3 us vs 13 us per row). The sort-by-size plan for a viewer who can read few files
--    evaluates it per candidate row (alice, 2,000 of 125,000 files: 89 ms exec before, see proposals.test.ts).
CREATE OR REPLACE FUNCTION fv_num(p text, k text) RETURNS bigint LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $$SELECT COALESCE((regexp_match(p, '\["' || k || '","([0-9]{1,18})"\]'))[1]::bigint, 0)$$;
-- 2) mime and source filters have no index: the planner bitmap-scans the whole tenant and sorts (bob, source+mime: 71 ms exec).
CREATE INDEX IF NOT EXISTS fv_doc_mime ON nodes (tenant, fv_prop(props, 'mime'), (COALESCE(fv_ts(props, 'modified'), 0)), id)
  WHERE valid_to IS NULL AND kind = 'document';
CREATE INDEX IF NOT EXISTS fv_doc_source ON nodes (tenant, source, (COALESCE(fv_ts(props, 'modified'), 0)), id)
  WHERE valid_to IS NULL AND kind = 'document';
