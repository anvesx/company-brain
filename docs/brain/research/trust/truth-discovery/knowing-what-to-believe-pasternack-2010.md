# Knowing What to Believe (when you already know something) (Pasternack, COLING 2010)

- URL: https://aclanthology.org/C10-1099.pdf
- PDF: pdf/knowing-what-to-believe-pasternack-2010.pdf
- Status: fetched in full
- Why it matters for source trust: defines three new fact-finders (Average-Log, Investment, PooledInvestment) and shows how to inject known constraints into any of them.

## What it says
Fact-finders iterate between source trustworthiness T(s) and claim belief B(c). The paper gives a common form for Sums, Average-Log, Investment, PooledInvestment and TruthFinder (Sec 3). It then adds prior knowledge: first-order logic rules are propositionalized into linear constraints, and after each iteration the beliefs are "corrected" by solving a linear program that moves them as little as possible to satisfy the constraints (Sec 4). Two ways to apply the constraints: IBT (every iteration) and L+I (once, after 20 iterations) (Sec 5.1). Experiments cover Wikipedia city populations, Wikipedia biographies and British spellings (Sec 5). Investment and PooledInvestment are the strongest base methods, and constraints lift the weak spelling task from 13.54 to over 80 percent (Table 1). Pages 877 to 885, COLING 2010.

## Algorithm
1. Sources S, claims C_s per source, mutual exclusion sets M_c (one claim per set is true). Each iteration: T^i(s) from B^{i-1}(C_s), then B^i(c) from T^i(S_c) (Sec 3).
2. Priors (Sec 3.1): B0_voted(c) = |S_c| / sum over d in M_c of |S_d|; B0_uniform(c) = 1/|M_c|; B0_fixed(c) = 0.5.
3. Sums (Sec 3.2.1): T^i(s) = sum over c in C_s of B^{i-1}(c); B^i(c) = sum over s in S_c of T^i(s); both normalized by their max; fixed priors.
4. Average-Log (Sec 3.2.2): T^i(s) = log|C_s| * sum over c in C_s of B^{i-1}(c) / |C_s|; B as in Sums; fixed priors.
5. Investment (Sec 3.2.3): T^i(s) = sum over c in C_s of B^{i-1}(c) * (T^{i-1}(s)/|C_s|) / sum over r in S_c of T^{i-1}(r)/|C_r|; B^i(c) = G(sum over s in S_c of T^i(s)/|C_s|) with G(x) = x^g, g = 1.2; voted priors.
6. PooledInvestment (Sec 3.2.4): same T; H^i(c) = sum over s in S_c of T^i(s)/|C_s|; B^i(c) = H^i(c) * G(H^i(c)) / sum over d in M_c of G(H^i(d)); g = 1.4; uniform priors.
7. TruthFinder simplified (Sec 3.3): T^i(s) = mean of B^{i-1}(c); B^i(c) = 1 - prod over s in S_c of (1 - T^i(s)).
8. Constraints (Sec 4.1): write knowledge as first-order logic, propositionalize to CNF; each clause becomes sum over c in P of c_v + sum over c in N of (1 - c_v) >= 1; each mutual exclusion set becomes c1_v + ... + cn_v = 1.
9. Cost (Sec 4.2): convert beliefs to votes omega_c = omega(B(c)); omega_inv(x) = min((1 - x)^-1, 10^10) for TruthFinder, identity for the others. Solve the LP minimizing VoteDistance = sum over c of max((omega_Mc - omega_c)(c_v - omega_c/omega_Mc), omega_c(omega_c/omega_Mc - c_v)).
10. Convert back (Sec 4.3): Vote Loss B(c) = omega^-1(min(omega_c, c_v * omega_Mc)) (used in experiments); Vote Conservation is the alternative.
11. Unknown claim U_M added to each mutual exclusion set with 0 votes in the experiments (Sec 4.4).
12. IBT applies steps 8 to 10 every iteration; L+I applies them once after 20 iterations (Sec 5.1).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Pop data | 44,761 population claims, 4,107 authors, 308 true facts | Sec 5.2 |
| Bio data | 129,847 birth dates, 34,201 death dates, 10,418 parent-child, 9,792 spouses, 2,685 test dates | Sec 5.2 |
| Spell data | 694 British words | Sec 5.2 |
| Pop, no prior | Vote 81.49, Sums 81.82, 3-Estimates 81.49, TruthFinder simplified 82.79, TruthFinder complete 84.42, Average-Log 80.84, Investment 87.99, PooledInvestment 80.19 (percent) | Table 1 |
| Pop with Larger2500 constraints, L+I | Investment 89.94 percent; 90.91 percent with 10,000 Larger pairs | Table 1, Sec 5.3.1 |
| SynPop, no prior | Vote 73.45, Sums 87.76, Average-Log 90.23, Investment 89.41, Pool 90.00, TruthFinder simplified 56.12 | Table 1 |
| SynPop with Pop plus or minus 8 percent, IBT | TruthFinder simplified 96.42, Pool 96.42, Vote 88.31 | Table 1 |
| Bio | Vote 89.80, TruthFinder complete 90.09, Pool 90.01; Pool with CS plus Decades IBT 91.32 | Table 1 |
| Spell, no prior | Vote 13.54, TruthFinder simplified 41.93 | Table 1 |
| Spell with CS plus Words100, IBT | Investment 73.59, Pool 80.68, Vote 35.10; Pool 84.86 with Words200 | Table 1, Sec 5.3.4 |

## Claims we can test against
1. Investment (g = 1.2) is the best method without priors on Pop at 87.99 percent (Table 1).
2. Simplified TruthFinder collapses on SynPop (56.12 percent) when claims per source vary a lot (Table 1).
3. Constraints applied every iteration (IBT) help Pool and TruthFinder more than once-at-end (L+I) (Table 1).
4. A few hundred verified facts ("common sense" plus 100 words) turn a 13.54 percent task into an 80.68 percent task (Table 1).
5. Normalizing by |C_s| (claims per source) matters: methods without it (Sums) are sensitive to prolific sources (Secs 3.2.1 to 3.2.3).
