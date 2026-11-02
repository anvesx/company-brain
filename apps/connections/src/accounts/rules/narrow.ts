import type { Zone } from "../types.js";

const WIDTH: Record<Zone, number> = { private: 0, personal: 1, company: 2 };

/** True when `next` lets fewer people see the data than `prev` did. */
export const narrows = (prev: Zone, next: Zone): boolean => WIDTH[next] < WIDTH[prev];
