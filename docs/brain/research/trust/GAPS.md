# Source trust: research gaps

What the spec takes from the cards, what the cards hold that we do not build yet, what to measure, where the maths is thin, three paper candidates, and open product questions. Card paths are relative to docs/brain/research/trust/. "Spec" means docs/specs/feature/source-trust.md. Nothing in ../exact prescribes a trust model; its audit row "Consolidation, contradiction policy" says "not built".

## 1. What the spec implements and where each rule comes from

| Rule | Formula or behaviour | Card | Where in card |
| --- | --- | --- | --- |
| 1 | Class priors signed 0.95 to opinion 0.35; news and opinion separate | our proposal; news-studies/fair-and-balanced-budak-2016.md; rater-methods/wikipedia-reliable-sources.md | Fig 1b (Fox opinion 0.28, news 0.03); Overview, four factors |
| 2 | A'(S) = log(nA / (1 - A)), A clamped to [0.01, 0.99] | truth-discovery/data-fusion-dong-2015.md | Sec 2.3 Eq 3; Theorem 1 (avoid 0 and 1) |
| 3 | C(v) = sum of A'(S); P(v) = 2^C(v) / sum of 2^C(v') | truth-discovery/data-fusion-dong-2015.md | Eq 3 and Eq 4 |
| 4 | Copier counts (1 - share) of its weight | truth-discovery/source-dependence-dong-2009.md; data-fusion-dong-2015.md | Eq 9, (1 - c)^d(S, G); Eq 13, I(S) |
| 5 | Decay max(0.1, 0.5^(t / halfLife)) | no card; nearest is retrieval/credibility-aware-generation-pan-2024.md | Sec 4.1, rt_score lowers credibility by floor(T / threshold) |
| 6 | Highest C wins; newest claim breaks a tie | no card ("Zep two clocks", README item 4) | card does not exist |
| 7 | A(S) = mean P(v); under 5 claims keep the prior | data-fusion-dong-2015.md; truthfinder-yin-2008.md; knowledge-based-trust-dong-2015.md | Eq 1; Eq 1; Sec 5.3.1, Sec 5.4, Sec 4 (m = 5) |
| 8 | Repeat until max change in A is under epsilon or maxRounds | data-fusion-dong-2015.md; source-dependence-dong-2009.md | Sec 3.3 (stop on stable or oscillation); Sec 4 (at most 2 ln n0 rounds) |
| 9 | Correction fixes P = 1 for one value, 0 for the rest | retrieval/ra-rag-hwang-2024.md; truth-discovery/knowing-what-to-believe-pasternack-2010.md | Sec 6.2, Fig 5; Sec 4.1 (mutual exclusion sums to 1) |
| 11 | Every passage returned with a trust label; none dropped | retrieval/credibility-aware-generation-pan-2024.md; retrieval/cram-deng-2024.md; retrieval/astute-rag-wang-2024.md | Fig 4; Table 2; Sec 4 step 4 |
| 10, 12 to 15 | Determinism, validation, Unicode, 100k claims under 2 s, empty input | engineering, no card | Waguih Sec 4 gives the scale limit we avoid |

The spec cites rule 4 by data-fusion-dong-2015 Eq 13 and 14 and source-dependence-dong-2009 Eq 11; an earlier draft wrote "Dong 2009 Eq 13", which that card does not contain.

## 2. What the literature has that we do not implement

| Gap | Card and where | Why it matters for a company knowledge base | Days |
| --- | --- | --- | --- |
| Bayesian copy detection from shared false values | source-dependence-dong-2009.md Eq 5 to 8, Theorem 3.1; data-fusion-dong-2015.md Eq 5 to 12, Theorem 2, Sec 3.3 cost O(abs(O) abs(S)^2 log abs(S)) | Hash edges catch pasted text only. A paraphrased wiki page that repeats a ticket's wrong owner is a copy too. Cost is the problem: 1k sources give 500k pairs per item. Dong 2009 Sec 6.5 kept 2,916 of 385,000 pairs. Waguih Sec 4: copy methods exceed memory above 5,000 sources. | 6 |
| Value similarity and implication | source-dependence-dong-2009.md Sec 5; truthfinder-yin-2008.md Eq 6, Sec 4.2.1 (imp = sim - base_sim); data-fusion Table 3 (0.87 to 0.89); truth-discovery-evaluation-waguih-2014.md Sec 3.3 (hurts on numeric weather) | "A. Smith" and "Alice Smith" split one truth into two losing groups. Dates and numbers in two formats do the same. | 3 |
| Dependence beyond pairwise copying | source-dependence-dong-2009.md Eq 11 (Pre(S) ordering); truth-discovery-survey-li-2016.md Sec 3.2.2 (joint precision and recall, follower graphs); knowledge-based-trust-dong-2015.md Sec 3 (extractor versus source) | One connector feeds many sources. An extractor bug looks like fifty sources agreeing. The org chart and the connector graph give dependence for free. | 5 |
| Time-aware truth | data-fusion-dong-2015.md Sec 2.1 (static data assumed); truth-discovery-survey-li-2016.md Sec 3.1 (streaming); retrieval/knowledge-conflicts-survey-xu-2024.md Sec 2.1, Sec 3.1 (outdated information); ra-rag-hwang-2024.md Limitations | A service owner changes. The old value was true then, yet rule 7 lowers the old source's accuracy as if it lied. Claims need validity windows; graph-store has them (exact README audit row). | 4 |
| Confidence calibration of P(v) | knowledge-based-trust-dong-2015.md Sec 5.2 (calibration buckets, WDev); data-fusion Table 5 (estimated 0.607 to 0.623 against sampled 0.542); truthfinder Sec 3.1.3 (five 0.6 sites give 0.99 without dampening); clasheval-wu-2024.md Sec 4.4.1, Table 3 | People see the number. The spec has no dampening, so three agreeing wikis reach near 1. | 2 |
| Two-parameter quality and negative claims | latent-truth-model-zhao-2012.md Table 6, Sec 4.1, Sec 5.3 | A system that lists every past owner and one that lists the current owner get one accuracy number. Team membership is multi-valued; one-true-value fails there. | 5 |
| Rater reliability for corrections | rater-methods/ad-fontes-methodology.md Method 2 and 4 (panel of three, averaged); allsides-methodology.md Method 7 (confidence from method count); news-studies/crowdsourced-source-quality-pennycook-2019.md Methods (8 fact-checkers, 0.97) | A correction is P = 1 whoever makes it. Two people correcting one item in opposite directions is a rater problem; today the newest wins. No card names a Dawid-Skene model; the cards describe panels and averaging only. Card does not say how to weight a rater. | 4 |
| Long-tail pooling | knowledge-based-trust-dong-2015.md Sec 4 (SplitAndMerge, m = 5, M = 10,000); Sec 5.3.1 (74 percent under 5 triples) | Most people and documents make fewer than five claims and keep the prior forever. Pool by team, folder or class. | 2 |
| Initialization bias and constraints | truth-discovery-survey-li-2016.md Sec 5; knowing-what-to-believe-pasternack-2010.md Sec 4, Table 1 (13.54 to 80.68 percent with constraints) | Class priors beat uniform, but a majority of wrong wikis still locks in. Business rules (start before end, budget non-negative) are known truths we ignore. | 5 |
| Answer time: consolidation | astute-rag-wang-2024.md Sec 4 Algorithm 1 steps 1 to 4; Table 3 | We group by exact item and value. No merge of passages that agree in different words, no internal-knowledge passage, no judgement by confirmation, frequency and detail. Needs an LLM; out of scope by spec. | 4 |
| Answer time: credibility input | credibility-aware-generation-pan-2024.md Sec 4.1 (Cred = min(rt_score(R, T), S)); Table 2 (labels alone move ChatGPT little) | Our label is accuracy only, no rank or age; an untrained model may ignore it. | 2 |
| Answer time: attention scaling | cram-deng-2024.md Sec 3.1 Eq 1, Sec 3.2 Eq 2, Table 3 | Needs a self-hosted model and head selection. | 5 |
| Answer time: per-source retrieval and probes | ra-rag-hwang-2024.md Sec 4.1 Eq 2 (alignment filter), natural language inference (NLI) clustering, Algorithm 1; Sec 4.2 Eq 5 and 6 | No retrieval per source, no paraphrase clustering, no label-free reliability from probe queries. Our accuracy needs structured claims first. | 6 |
| Answer time: pollution defence and prior check | misinformation-pollution-pan-2023.md Sec 5, Table 4 (vote across groups gains 11 to 23 percent); clasheval-wu-2024.md Sec 4.4.1 | One planted passage per question is enough. We do not vote across passage groups or compare the model's own answer probability. | 3 |

## 3. What is not calculated yet and should be

| Quantity | Metric | Gold set | Threshold |
| --- | --- | --- | --- |
| Winner precision at k | Share of items whose top k groups contain the truth, k = 1 and 2 | The spec's seeded set: 20 sources, 500 items, 5 copiers at share 0.8. Then 100 hand-checked items from one tenant, as Dong 2015 Sec 4 did with books | k = 1 at or above the replication test's accuracy-plus-copies number; k = 2 at or above 0.95 |
| Calibration error | Expected calibration error (ECE) over 10 equal-count buckets of P(v), plus the per-bucket table from KBT Sec 5.2 | Same gold sets | ECE at or below 0.05; no bucket off by more than 0.10 |
| Time to correct | Calls and rounds from a correction until the wrong source's accuracy drops and the winner flips | Synthetic: one correction against a three-source majority | Flip in the next call, one round; accuracy drop at or above 1 / claims of that source |
| Copy-detection precision and recall | Edges found against planted copiers, at the pair level | Synthetic copiers at c = 0.8, Dong 2009 Sec 6.5 parameters; public set to be sourced | Precision at or above 0.9, recall at or above 0.8; Dong 2009 Figs 5 and 7 reach 0.99 precision when parameters match |
| Tenant isolation | Byte-equal output for tenant A with and without tenant B's claims in the same process | Property test over random tenants | Zero differing bytes over 10,000 runs |
| Latency at 100k claims | p99 wall time over 30 runs, 10k items, 1k sources, 20 rounds | The scale test from spec rule 14 | p99 at or below 2 s; the spec gives only a single bound |

None of these exist today. The spec's replication test asserts an order, not a level.

## 4. Where the maths is thin

| Point | What the spec does | Why it is thin | What the card says |
| --- | --- | --- | --- |
| n in A'(S) | n = distinct values on the item minus 1 | The paper's n is the count of possible false values, not observed ones. Dong used n = 100 on books (data-fusion Sec 4). With n = 1 a source at 0.5 gets weight 0; with n = 9 the same source gets 3.17 bits. Items with more disagreement hand every source more weight. | Sec 2.1 assumes false values uniform over n; a source is good above 1 / (1 + n). Sensitivity to n: card does not say. |
| Clamp [0.01, 0.99] | Clamp A before the log | At n = 1, A = 0.99 gives 6.6 bits and A = 0.01 gives minus 6.6. One clamped source outweighs four sources at 0.75 (1.58 bits each). A source corrected wrong on every claim pins at 0.01 and votes against itself at full strength. | Theorem 1: 0 and 1 must be avoided. The bound value: card does not say. |
| Oscillation | Stop on epsilon or maxRounds; report converged false | No cycle detection. A period-2 cycle reports converged false at maxRounds with no reason. Copy edges are fixed input today, so the AccuCopy loop is absent; it returns with the Bayesian detector. | data-fusion Sec 3.3 stops on oscillation; how it is detected: card does not say. Waguih Sec 3.1: 3-Estimates oscillates near 0.50. |
| Decay sign | Factor in [0.1, 1] multiplies A'(S) | A'(S) is negative below 1 / (1 + n). A positive factor keeps the sign, so an old wrong-leaning claim hurts less, never helps. The 0.1 floor is ours. | No card covers decay. |
| Tie rule | Within epsilon: newest wins, tie false; same at: smaller string wins, tie true | epsilon = 1e-6 on C is in bits, not probability. Bulk imports share a millisecond, so the alphabet decides. Two scores 1e-5 apart report no tie. | No card. Astute Sec 4.4 shows both groups when they tie. |

## 5. Three paper candidates

### 5.1 Copy detection without labels inside an enterprise knowledge base

Abstract. Company sources copy by paraphrase, not by paste. We extend the shared-false-value test (source-dependence-dong-2009.md Eq 5 to 8) with value similarity (Sec 5) and a candidate filter from the connector graph. We ask whether the Bayesian detector finds copies that content hashes miss, and what it costs.

Experiment: plant copiers at share 0.5 to 0.95 with paraphrased values; measure edge precision and recall and winner precision. Baseline: hash edges from the spec, and majority vote. Dataset: synthetic from the spec's generator; the book set from Dong 2009 Sec 6.5 if it can be sourced; an enterprise set to be sourced. Contribution: recall above hash edges by 0.2 or more, and a winner gain in the direction of data-fusion Table 3 (0.79 to 0.87), at under one minute for 1k sources.

### 5.2 Corrections as supervision: calibration of truth-discovery confidence

Abstract. Truth discovery gives a probability per value, but no card checks that 0.9 means 90 percent. We measure ECE of P(v) under the spec's rules, then under human corrections treated as constraints (knowing-what-to-believe-pasternack-2010.md Sec 4) and as consensus agreement (ra-rag-hwang-2024.md Sec 4.2 Eq 5 and 6).

Experiment: sweep the share of true claims from pessimistic to optimistic with the Waguih generator (Table 4); add k corrections; plot ECE against k. Baseline: no corrections, and the dampened TruthFinder form (Eq 7 and 8). Dataset: Waguih synthetic; Wikipedia population and biography claims from Pasternack Sec 5.2. Contribution: an ECE curve that drops below 0.05 with a stated k, and a failure point where corrections stop helping.

### 5.3 Label or drop: trust-labelled passages at answer time in a company brain

Abstract. CAG Fig 4 and CrAM Table 2 say labelling beats dropping, on web data with oracle or model-assigned scores. We test with scores learned by truth discovery over structured claims, not assigned.

Experiment: one planted wrong passage per question with plausible edits (clasheval-wu-2024.md Sec 3.3); conditions plain, drop, label, label plus both-sides when tied. Baseline: plain retrieval and drop. Dataset: a synthetic company corpus; Natural Questions and TriviaQA as named in cram-deng-2024.md Sec 4.1. Contribution: label beats drop, and the all-wrong case stays near no-retrieval as in astute-rag-wang-2024.md Fig 6.

## 6. Open questions for the product

| Question | What the cards offer | Decision needed |
| --- | --- | --- |
| Per-person trust scores | A chat author is a source. Its accuracy is a performance score computed by a machine. No card covers privacy. | Score people at class or team level only, or show a person their own score and no one else's |
| Showing "we are not sure" | Astute Sec 4.4 shows both groups with citations. AllSides publishes Low, Medium, High confidence (Method 7). NewsGuard uses five bands. | A confidence floor below which the answer shows every group, and a band label instead of a decimal |
| What a user can override | Priors per class (spec option). Corrections per item. Wikipedia keeps five statuses and demotes only by discussion (Method 4 to 6). | Whether a user can pin or deprecate a source, whether an override expires, who may correct, and what happens when two corrections disagree |
| Decay per class | No card. | One half-life per class, or none for signed records |
