import { check } from "k6";
import http from "k6/http";

const base = __ENV.BRAIN_URL || "http://127.0.0.1:3000/mcp";
const token = __ENV.BRAIN_TOKEN || "";

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 50 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<500"] },
};

const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search", arguments: { query: "quarterly plan", limit: 5 } } });

export default function () {
  const res = http.post(base, body, {
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}` },
  });
  check(res, { "status 200": (r) => r.status === 200 });
}
