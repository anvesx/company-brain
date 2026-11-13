import { JSDOM } from "jsdom";

export const dom = (html: string): Document => new JSDOM(html).window.document;
/** File ids a page links to, in order: every `href="/files/<id>"`. */
export const ids = (html: string): string[] => [...html.matchAll(/href="\/files\/([^"?#]+)"/g)].map((m) => decodeURIComponent(m[1] as string));
/** The "N files you can access" line of a cluster page. */
export const fileCount = (html: string): number => Number(/(\d+)\+? files you can access/.exec(html)?.[1]);
/** Every cluster in a tree page, nested or not: id, title, kind, why and the shown count. */
export const clusterRows = (html: string) =>
  [...dom(html).querySelectorAll("ul.tree li")].map((li) => {
    const own = (cls: string) => li.querySelector(`:scope > .${cls}`)?.textContent ?? "";
    const a = li.querySelector(':scope > a[href^="/clusters/"]');
    return {
      id: decodeURIComponent(a?.getAttribute("href")?.slice(10) ?? ""),
      title: a?.textContent ?? "",
      type: own("type"),
      why: own("why").replace(/^Why: /, ""),
      count: own("count").replace(/\s*files$/, ""),
      parent: decodeURIComponent(li.parentElement?.closest("li")?.querySelector(":scope > a")?.getAttribute("href")?.slice(10) ?? ""),
    };
  });
/** The value shown next to "Readers" on a file page, or undefined when the page has no readers line. */
export const readersOf = (html: string): string | undefined => {
  const dt = [...dom(html).querySelectorAll("dt")].find((d) => d.textContent === "Readers");
  return dt?.nextElementSibling?.textContent ?? undefined;
};
