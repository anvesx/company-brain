import { buildResolution } from "./answer/groups.js";
import { prepare } from "./input/prepare.js";
import { validate } from "./input/validate.js";
import { isLearned } from "./score/accuracy.js";
import { runRounds } from "./score/rounds.js";
import type { TrustInput, TrustOptions, TrustResult } from "./types.js";

const DEFAULT_MIN_CLAIMS = 5;
const DEFAULT_MAX_ROUNDS = 20;
const DEFAULT_EPSILON = 1e-6;

/**
 * Spec rules 8, 10, 12, 15 and 16: validate, normalise, run the rounds, build one Resolution per
 * item. Pure: never mutates its arguments, reads no clock (options.now is the clock).
 */
export const resolveClaims = (input: TrustInput, options: TrustOptions): TrustResult => {
  validate(input, options);
  const model = prepare(input, options);
  const settings = {
    minClaims: options.minClaims ?? DEFAULT_MIN_CLAIMS,
    maxRounds: options.maxRounds ?? DEFAULT_MAX_ROUNDS,
    epsilon: options.epsilon ?? DEFAULT_EPSILON,
  };
  const run = runRounds(model, settings);
  return {
    sources: model.sourceIds.map((source, s) => ({
      source,
      accuracy: run.accuracy[s]!,
      claims: model.counts[s]!,
      learned: isLearned(model.counts[s]!, settings.minClaims),
    })),
    items: model.items.map((item, i) => buildResolution(item, run.votes[i]!, model.sourceIds, settings.epsilon)),
    rounds: run.rounds,
    converged: run.converged,
  };
};
