# Data Fusion: Resolving Conflicts from Multiple Sources (Dong, WAIM 2013; arXiv 2015)

- URL: https://arxiv.org/abs/1503.00310
- PDF: pdf/data-fusion-dong-2015.pdf
- Status: fetched in full
- Why it matters for source trust: it is the pre-LLM reference for picking the true value when sources disagree, and it sets out the three generations of method (naive voting, source accuracy, source dependence) with a worked case where each step adds precision.

## What it says
Naive voting fails for two reasons: sources differ in accuracy, and copiers repeat a wrong value and inflate its count (Section 1, Table 1). The first improvement weights each source by its accuracy, where accuracy is the average probability of the values it gives (Section 2.2). Accuracy and value correctness depend on each other, so both are computed iteratively (Section 3.3). The second improvement detects copying between sources from the values they share: sharing the same false value is strong evidence of copying because independent sources are unlikely to make the same mistake (Section 3.1, Theorem 2). A copier's vote is discounted to its independent fraction (Section 3.2). On a real dataset of 877 bookstores and 1,263 books, precision rises from 0.71 for naive voting to 0.87 with accuracy plus copy detection and 0.89 when value similarity is added as well (Table 3). Copying alone gave the single largest gain (Section 4). Use naive voting only when sources have similar accuracy and are independent (Theorem 1); otherwise add accuracy weighting; add copy detection whenever sources may share upstream data.

## Method
1. Assumptions (Section 2.1): one true value per object, false values uniformly distributed over n possible wrong values, static data.
2. Source accuracy: A(S) = (sum of P(v) over values v given by S) divided by the number of values S gives (Equation 1). A source is good if A(S) is above 1 / (1 + n).
3. Value confidence: A'(S) = log(n A(S) / (1 minus A(S))); C(v) = sum of A'(S) over sources S that give v; P(v) = 2^C(v) / sum over v' of 2^C(v') (Equations 3 and 4).
4. Theorem 1: with equal accuracies this reduces to naive voting. Accuracies of exactly 0 or 1 must be avoided.
5. Copy detection (Section 3.1): c = probability a copier copies a given value; for a pair of sources count k_t shared true values, k_f shared false values, k_d different values; compute the Bayesian probability that the pair is independent with prior alpha (Equations 5 to 12). Theorem 2: more shared false values means higher copying probability.
6. Independent vote: I(S) = product over possible originals S' of (1 minus c times (Pr(S copies S') + Pr(S' copies S))) (Equation 13); C(v) = sum of A'(S) times I(S) (Equation 14), with a greedy ordering so a value is counted once per copy chain.
7. Algorithm AccuCopy (Section 3.3): initialize equal accuracy and equal value probabilities; each round compute copying, then value confidence, then source accuracy; stop when accuracy is stable or oscillation is detected. Each round costs O(|O| |S|^2 log |S|). Theorem 3: without accuracy, it converges in at most 2 l n0 rounds.

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Case-study dataset | 877 bookstores, 1,263 books, 24,364 listings, 19 listings per book on average, 4 distinct author lists per book on average | Section 4 |
| Golden standard | 100 books with authors read from the cover | Section 4 |
| Precision by method | VOTE 0.71, SIM 0.74, ACCU 0.79, COPY 0.83, ACCUCOPY 0.87, ACCUCOPYSIM 0.89 | Table 3 |
| Gain over naive voting | 25.4 percent | Section 4 |
| Rounds and time | ACCU 23 rounds 1.1 s, COPY 3 rounds 28.3 s, ACCUCOPY 22 rounds 185.8 s, ACCUCOPYSIM 18 rounds 197.5 s | Table 3 |
| Books where ACCUCOPY and VOTE disagree | 143; ACCUCOPY right on 119, VOTE right on 15, both wrong on 9 | Section 4 |
| Error types under naive voting on 100 books | missing authors 23, additional authors 4, mis-ordering 3, misspelling 2, incomplete names 2 | Table 2 |
| Dependent pairs found | 508 of 2,916 pairs that share at least 10 books (385,000 pairs total) | Section 4 |
| Most-copied bookstores | average 12.8 copiers, 460 books, accuracy 0.75; voting over only these gives precision 0.58 | Table 4, Section 4 |
| Estimated vs sampled source accuracy | sampled 0.542; ACCUCOPYSIM 0.607 (difference 0.082), ACCUCOPY 0.614 (0.087), ACCU 0.623 (0.096) | Table 5 |
| Parameters used | alpha 0.2, c 0.8, epsilon 0.2, n 100; results stable for alpha 0.05 to 0.5, c 0.5 to 0.95 | Section 4 |
| Worked example | accuracies 0.97, 0.6, 0.4 with n = 5 give vote weights 4.7, 2, 1.5 | Example 2, Section 2.3 |

## Claims we can test against
1. Weighting votes by estimated source accuracy beats raw counts when accuracies differ; the paper shows plus 8 points precision (Table 3).
2. Discounting copied values beats accuracy weighting alone, plus 12 points over voting here (Table 3); large, widely copied sources are not more accurate (Table 4).
3. Two sources that share a wrong value are probably not independent; this test needs no labels (Theorem 2).
4. The iteration can oscillate once accuracy and copying are both estimated; stop on oscillation rather than waiting for convergence (Section 3.3).
