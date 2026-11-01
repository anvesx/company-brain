import type { Registry } from "@brain/pointer-registry";

const PAGE = 1000;

/** Ids of the tenant's live (not tombstoned) pointers, read page by page with `afterId` until exhausted. */
export function liveIds(registry: Registry, tenantId: string): string[] {
  const ids: string[] = [];
  for (let afterId: string | undefined; ; ) {
    const page = registry.list({ tenantId, limit: PAGE, ...(afterId !== undefined && { afterId }) });
    for (const pointer of page) if (pointer.deletedAt === null) ids.push(pointer.id);
    if (page.length < PAGE) return ids;
    afterId = page[page.length - 1]?.id;
  }
}
