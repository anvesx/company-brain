/** Hosts where plain http is allowed: the machine itself, so local development and native app redirects work. */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The URL, or null when the text is not an absolute URL. */
export const parseUrl = (text: string): URL | null => {
  try {
    return new URL(text);
  } catch {
    return null;
  }
};

export const isLoopbackHost = (hostname: string): boolean => LOOPBACK.has(hostname);

/** True for https anywhere, and for http only on loopback. The one rule every URL in the package follows. */
export const httpsOrLoopback = (text: string): boolean => {
  const url = parseUrl(text);
  return url !== null && (url.protocol === "https:" || (url.protocol === "http:" && isLoopbackHost(url.hostname)));
};
