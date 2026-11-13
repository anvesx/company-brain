/** Visible detail ids: alice reads f50, f100, ...; bob reads the even ones. */
const NEEDLES = ["a1b2", "c3d4", "e5f6", "09ab", "7c7c", "dead"];
export const paths = (who: string): Record<string, (i: number) => string> => ({
  "/files": () => "/files?limit=50",
  "/files?sort=title": () => "/files?sort=title&limit=50",
  "/files?sort=size": () => "/files?sort=size&limit=50",
  "/files?q=": (i) => `/files?q=${NEEDLES[i % 6]}`,
  "/files?owner=": (i) => `/files?owner=u${i % 200}`,
  "/files/:id": (i) => `/files/f${(who === "alice" ? 50 : 2) * (1 + (i % 1000))}`,
  "/clusters": () => "/clusters",
  "/clusters?limit=5": () => "/clusters?limit=5",
  "/clusters/:id (leaf)": (i) => `/clusters/c${201 + (i % 1700)}`,
  "/clusters/:id (giant 33k)": () => "/clusters/c200",
  "/clusters/:id (root)": (i) => `/clusters/c${i % 20}`,
});
