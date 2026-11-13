/** Every path must return real rows for its viewer (the suite asserts it): erin reads g%50=0, carol g%7=0, alice g%17<8, bob the even files. */
const NEEDLES = ["a1b", "c3d", "e5f", "09a", "7c7", "dea", "école", "Übersicht"].map(encodeURIComponent);
const OWNERS: Record<string, string[]> = { erin: ["u0", "u50", "u100", "u150"], bob: Array.from({ length: 100 }, (_, i) => `u${i * 2}`) };
const owner = (who: string, i: number): string => (OWNERS[who] ?? Array.from({ length: 200 }, (_, k) => `u${k}`))[i % (OWNERS[who]?.length ?? 200)] as string;
const DETAIL: Record<string, number> = { erin: 50, carol: 7, alice: 17, bob: 2 };
const RANGE = "from=2026-01-03T00:00:00Z&to=2026-01-06T00:00:00Z";
export const paths = (who: string): Record<string, (i: number) => string> => ({
  "/files": () => "/files?limit=50",
  "/files?sort=title": () => "/files?sort=title&limit=50",
  "/files?sort=size": () => "/files?sort=size&limit=50",
  "/files?q=": (i) => `/files?q=${NEEDLES[i % 8]}`,
  "/files?owner=": (i) => `/files?owner=${owner(who, i)}`,
  "/files?owner=&sort=size": (i) => `/files?owner=${owner(who, i)}&sort=size`,
  "/files?source=&mime=": () => "/files?source=gdrive&mime=application/pdf",
  "/files?source=&sort=title": () => "/files?source=gdrive&sort=title&dir=asc",
  "/files?from=&to=": () => `/files?${RANGE}`,
  "/files?cluster=c5&sort=size": () => "/files?cluster=c5&sort=size&limit=50",
  "/files?cluster=c5&sort=title": () => "/files?cluster=c5&sort=title",
  "/files?cluster=c300 (giant)": () => "/files?cluster=c300",
  "/files/:id": (i) => `/files/f${(DETAIL[who] ?? 2) * (1 + (i % 1000))}`,
  "/clusters": () => "/clusters",
  "/clusters/:id (leaf)": (i) => `/clusters/c${301 + (i % 2600)}`,
  "/clusters/:id (c5)": () => "/clusters/c5",
  "/clusters/:id (giant 50k)": () => "/clusters/c300",
  "/clusters/:id (root)": (i) => `/clusters/c${i % 30}`,
});
