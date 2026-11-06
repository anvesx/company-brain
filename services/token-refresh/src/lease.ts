// The lease lives in @anvesx/identity so the sweep and identity's on-demand refresh share one implementation.
export { LEASE_MS, releaseLease, takeLease } from "@anvesx/identity";
