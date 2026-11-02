#!/usr/bin/env node
import { start } from "./cli/start.js";

try {
  const running = await start(process.env, () => Date.now() / 1000);
  console.log(`connections api listening on 127.0.0.1:${running.port}`);
  process.once("SIGTERM", () => void running.close().then(() => process.exit(0)));
} catch (e) {
  console.error(`connections: ${(e as Error).message}`);
  process.exit(1);
}
