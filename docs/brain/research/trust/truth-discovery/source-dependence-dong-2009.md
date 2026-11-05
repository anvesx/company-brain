# Integrating Conflicting Data: The Role of Source Dependence (Dong, VLDB 2009)

- URL: http://lunadong.com/publication/dependence_vldb.pdf
- PDF: pdf/source-dependence-dong-2009.pdf
- Status: fetched in full
- Why it matters for source trust: shows that copiers inflate votes for wrong values, gives a Bayesian test for copying, and discounts copied votes.

## What it says
When sources copy from each other, a wrong value can win a vote. The key observation (Sec 3.1): two independent sources rarely share the same false value, because there are many ways to be wrong, so shared false values are strong evidence of copying. The paper computes the probability that two sources are dependent with Bayes rule over the values they share, then counts votes so that a source gets a vote of 1 only to the extent it is independent. Source accuracy is added (ACCU) and value similarity (SIM). Example 1.1 and Table 1 show five sources where S3 is copied by S4 and S5 and naive voting gets three of five affiliations wrong. On a book author dataset ACCU and SIM reach precision 0.87 and 0.89 vs 0.71 for voting (Table 6). PVLDB vol 2 no 1, pages 550 to 561.

## Algorithm
1. Parameters: n false values per object, error rate eps, copy probability c (probability that a copier's value is copied rather than independent), prior alpha of dependence (Sec 3.1).
2. For independent S1, S2: Pr(same true value) = (1 - eps)^2 (Eq 1); Pr(same false value) = eps^2 / n (Eq 2); Pr(different) = Pd = 1 - (1 - eps)^2 - eps^2 / n (Eq 3).
3. For dependent S1, S2: Pr(same true) = (1 - eps)c + (1 - eps)^2 (1 - c) (Eq 5); Pr(same false) = eps c + eps^2 / n (1 - c) (Eq 6); Pr(different) = Pd (1 - c) (Eq 7).
4. Bayes (Eq 8): Pr(S1 ~ S2 | observations) from the counts of shared true, shared false and different values with prior alpha. Theorem 3.1: more shared false values raise the dependence probability more than shared true values do.
5. Vote count with a known dependence graph G (Eq 9): V(v, G) = sum over S in So(v) of (1 - c)^d(S, G), where d(S, G) is the number of sources S copies from.
6. With probabilistic dependence (Eq 11): I(S) = prod over S0 in Pre(S) of (1 - c * P(S ~ S0)); vote = sum of I(S). Sources are ordered so that copiers are discounted against sources already counted.
7. Iterate: decide truths by votes, recompute dependence from the truths, repeat; converges in a few rounds (Sec 3.3).
8. ACCU (Sec 4): source accuracy A(S) = mean probability of its values (Eq 18); value probability P(v) proportional to prod over S in So(v) of nA(S) / (1 - A(S)) (Eq 21); confidence C(v) = sum over S of A'(S) with A'(S) = ln(nA(S) / (1 - A(S))) (Eqs 22 to 24). Copiers are ignored when computing confidence. Converges in at most 2 ln n0 rounds.
9. SIM adds value similarity so near-identical values support each other (Sec 5).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Toy example | 5 sources, 5 researchers; naive vote wrong for 3 of 5 because S3 is copied by S4 and S5 | Example 1.1, Table 1 |
| Book data | 877 bookstores, 1,263 books, 24,364 listings, 19 listings per book on average, 4 distinct author lists per book on average | Sec 6.5 |
| Parameters on book data | alpha = 0.2, c = 0.8, eps = 0.2, n = 100 | Sec 6.5 |
| Precision on book data | NAIVE 0.71, NAIVE SIM 0.74, ACCU NO DEP 0.79, DEPEN 0.83, ACCU 0.87, SIM 0.89, TF NO SIM 0.71, TF5 0.83 | Table 6 |
| Rounds and time | DEPEN 3 rounds 28.3 s; ACCU 22 rounds 185.8 s; SIM 18 rounds 197.5 s; ACCU NO DEP 23 rounds 1.1 s | Table 6 |
| Copy detection scale | 385,000 bookstore pairs, 2,916 share at least 10 books, 508 pairs likely dependent | Sec 6.5 |
| Copied-from bookstores | copied by more than 10 others; 460 books each on average, accuracy 0.75; all bookstores average 28 books | Table 7, Sec 6.5 |
| Voting on heavily copied stores only | precision 0.58 | Sec 6.5 |
| Synthetic | ACCU precision 0.99 when copier parameters match generation; precision drops when c is set to 0.2 | Figs 5 and 7, Sec 6.3 |

## Claims we can test against
1. Shared false values are stronger evidence of copying than shared true values (Theorem 3.1).
2. Discounting copied votes raises precision from 0.71 to 0.83 on book authors; adding accuracy to 0.87 (Table 6).
3. Large, often-copied sources are not accurate: 0.75 mean accuracy, voting over them alone gives 0.58 (Table 7, Sec 6.5).
4. Dependence detection converges in about 3 rounds, accuracy estimation in about 20 (Table 6).
5. Treating sources as independent (ACCU NO DEP) leaves 8 points of precision on the table (0.79 vs 0.87, Table 6).
