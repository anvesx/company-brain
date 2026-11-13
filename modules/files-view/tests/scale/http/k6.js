// k6 run -e BASE_URL=http://127.0.0.1:PORT -e TOKEN=<bearer from the OIDC provider> tests/scale/k6.js
// Open-loop: requests arrive on schedule, so a slow server shows as latency or dropped_iterations.

import { check } from "k6";
import http from "k6/http";

const base = __ENV.BASE_URL;
const headers = { headers: { authorization: `Bearer ${__ENV.TOKEN}` } };
const scenario = (exec, rate) => ({
  executor: "constant-arrival-rate",
  exec,
  rate,
  timeUnit: "1s",
  duration: __ENV.DURATION || "30s",
  preAllocatedVUs: 50,
  maxVUs: 400,
});

export const options = {
  scenarios: { list: scenario("list", 50), search: scenario("search", 30), clusters: scenario("clusters", 30), detail: scenario("detail", 30) },
  thresholds: { http_req_failed: ["rate<0.01"], http_req_waiting: ["p(95)<300"], checks: ["rate>0.99"], dropped_iterations: ["count==0"] },
};

const ok = (r, what) =>
  check(r, { [`${what} 200`]: (x) => x.status === 200, [`${what} no-store`]: (x) => (x.headers["Cache-Control"] || "").includes("no-store") });
export function list() {
  const first = http.get(`${base}/files?sort=modified`, headers);
  ok(first, "list");
  const next = /href="([^"]*cursor=[^"]+)"/.exec(first.body);
  if (next) ok(http.get(`${base}${next[1].replace(/&amp;/g, "&")}`, headers), "page 2");
}
export function search() {
  ok(http.get(`${base}/files?q=${["report", "a1b2", "q3", "dead"][__ITER % 4]}`, headers), "search");
}
export function clusters() {
  ok(http.get(`${base}/clusters`, headers), "clusters");
  ok(http.get(`${base}/clusters/c${200 + (__ITER % 1800)}`, headers), "cluster members");
}
export function detail() {
  ok(http.get(`${base}/files/f${1 + ((__ITER * 7919) % 100000)}`, headers), "detail");
}
