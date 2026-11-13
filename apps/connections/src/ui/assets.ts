import { Hono } from "hono";
import { appCss } from "./shell/css.js";

/** `GET /ui/app.css`, the app's own styles on top of the design-system's. */
export const assets = (): Hono =>
  new Hono().get("/ui/app.css", (c) => c.body(appCss, 200, { "content-type": "text/css; charset=utf-8", "cache-control": "no-cache" }));
