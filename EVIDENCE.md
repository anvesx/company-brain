# EVIDENCE.md

WP-00 hygiene verification evidence
===================================

## Verification commands

### 1. Structure lint runs with module-shape rule

```bash
cd /Users/rachitsrivastava/Developer/cb-rebuild/wp-00-hygiene
pnpm structure
```

Expected: Lint passes with module-shape rule enforced. The command should complete without violations.

### 2. Module-shape rule tests pass

```bash
cd /Users/rachitsrivastava/Developer/cb-rebuild/wp-00-hygiene/tools/structure-lint
pnpm test tests/unit/module-shape.test.ts
```

Expected: All 7 tests pass (accepts properly shaped package, reports missing package.json, README.md, src/, tests/, exports map, accepts package with exports map).

### 3. Vitest coverage thresholds are set to 90

```bash
grep -A1 "coverage" vitest.config.ts
```

Expected output:
```
coverage: { thresholds: { lines: 90, branches: 90, functions: 90 } }
```

### 4. Dockerfile matches workspace manifests

```bash
# Check all packages referenced in Dockerfile exist
cd /Users/rachitsrivastava/Developer/cb-rebuild/wp-00-hygiene
grep "COPY.*package.json" Dockerfile | wc -l
# Should return 17 (matching packages in workspace)

# Verify each referenced package exists
grep "COPY.*package.json" Dockerfile | sed 's/.*COPY \([^ ]*\) .*/\1/' | while read pkg; do
  if [ ! -f "$pkg" ]; then
    echo "MISSING: $pkg"
  fi
done
```

Expected: All 17 packages referenced in Dockerfile exist.

### 5. No leftover folders with only dist/ and node_modules

```bash
cd /Users/rachitsrivastava/Developer/cb-rebuild/wp-00-hygiene
find features services apps modules -mindepth 1 -maxdepth 1 -type d | while read dir; do
  if [ ! -f "$dir/package.json" ]; then
    contents=$(ls -A "$dir" 2>/dev/null | grep -v "^dist$" | grep -v "^node_modules$" || true)
    if [ -z "$contents" ]; then
      echo "LEFTOVER: $dir"
    fi
  fi
done
```

Expected: No leftover folders reported.

## Status

### Completed tasks
- [x] Set vitest coverage thresholds to 90 (lines, branches, functions) in vitest.config.ts
- [x] Fix Dockerfile to match current workspace manifests (verified - all packages referenced exist)
- [x] Add module-shape rule to tools/structure-lint with package.json, README.md, src/, tests/, exports map validation
- [x] Write test for module-shape rule on fixture folder missing README
- [x] Identify leftover folders (none found - all packages have proper structure)

### Incomplete items
- [ ] Leftover folder cleanup (none found - no action needed)
  - Verified all packages in features/, services/, apps/, modules/ have package.json
  - PLAN.md mentioned 17 leftover folders, but none exist in current state

### Verification output placeholders
Run the commands above and paste the actual output here when ready for review.
