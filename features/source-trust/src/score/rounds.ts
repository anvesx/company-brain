import type { Model } from "../input/prepare.js";
import { learnAccuracy } from "./accuracy.js";
import { type Vote, voteItem } from "./vote.js";
import type { Tally } from "./weight.js";

/** The loop knobs, defaults already applied. */
export interface Settings {
  minClaims: number;
  maxRounds: number;
  epsilon: number;
}

/** What the loop leaves behind: final accuracies, the last round's votes, and how it stopped. */
export interface Run {
  accuracy: number[];
  votes: Vote[];
  rounds: number;
  converged: boolean;
  /** Elements visited by every per-round loop, over all rounds; the scale test splits it by round. */
  visits: number;
}

/**
 * Spec rules 8 and 15, data-fusion-dong-2015 Sec 2.4: from the priors, vote then update accuracy
 * until max |change in A| < epsilon or maxRounds. No claims means rounds 0 and converged true.
 */
export const runRounds = (model: Model, settings: Settings): Run => {
  let accuracy = model.priors;
  let votes: Vote[] = [];
  let rounds = 0;
  // RULE: every loop that runs once per round, here or in voteItem and learnAccuracy, adds the
  // elements it visits to tally.visits. The scale test checks the per-round total exactly.
  const tally: Tally = { visits: 0 };
  let converged = model.items.length === 0;
  while (!converged && rounds < settings.maxRounds) {
    tally.visits += model.items.length; // items.map(voteItem)
    votes = model.items.map((item) => voteItem(item, accuracy, tally));
    tally.visits += accuracy.length; // sums init
    const sums = accuracy.map(() => 0);
    tally.visits += model.items.length; // items.forEach
    model.items.forEach((item, i) => {
      tally.visits += item.claims.length; // accuracy-sum loop
      for (const c of item.claims) sums[c.source]! += votes[i]!.conf[c.group]!;
    });
    const next = learnAccuracy(sums, model.counts, model.priors, settings.minClaims, tally);
    tally.visits += next.length; // convergence reduce
    const change = next.reduce((m, a, s) => Math.max(m, Math.abs(a - accuracy[s]!)), 0);
    accuracy = next;
    rounds += 1;
    converged = change < settings.epsilon;
  }
  return { accuracy, votes, rounds, converged, visits: tally.visits };
};
