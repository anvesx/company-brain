// GET /v1/catalog on the real connections launcher at a fixed arrival rate. Run through bin/run.mjs.

import { check } from "k6";
import http from "k6/http";
import { thresholds } from "./thresholds.js";

export const options = {
  scenarios: {
    catalog: {
      executor: "constant-arrival-rate",
      rate: Number(__ENV.RATE || 300),
      timeUnit: "1s",
      duration: __ENV.DURATION || "30s",
      preAllocatedVUs: 10,
      maxVUs: 40,
    },
  },
  thresholds: thresholds("catalog"),
};

export default function () {
  const res = http.get(`${__ENV.BASE}/v1/catalog`, { headers: { authorization: `Bearer ${__ENV.TOKEN}` } });
  check(res, {
    "status 200": (r) => r.status === 200,
    "lists providers": (r) => {
      const p = r.json("providers");
      return Array.isArray(p) && p.length > 0 && typeof p[0].id === "string";
    },
  });
}
