# A Bayesian Approach to Discovering Truth from Conflicting Sources for Data Integration (Zhao, PVLDB 2012)

- URL: http://vldb.org/pvldb/vol5/p550_bozhao_vldb2012.pdf
- PDF: pdf/latent-truth-model-zhao-2012.pdf
- Status: fetched in full
- Why it matters for source trust: splits source quality into two numbers (false positive rate and sensitivity) so a source that lists everything and a source that lists little are judged differently.

## What it says
Earlier methods assume one true value per object and one quality score per source. The Latent Truth Model (LTM) handles multi-valued attributes (a book has several authors) where each claimed value is true or false on its own. A source has two quality parameters: specificity (1 minus false positive rate) and sensitivity (1 minus false negative rate). The authors show with a worked example (Table 6) that single scores like precision or accuracy cannot separate a source that over-claims from one that under-claims. Truth and quality are inferred with collapsed Gibbs sampling that runs in linear time. An incremental version (LTMinc) updates on new data without re-running. On book authors and movie casts LTM beats voting, 3-Estimates and TruthFinder (Table 7). PVLDB vol 5 no 6, pages 550 to 561.

## Algorithm
1. Each claim c says source s_c observes value of fact f with o_c = 1 (present) or 0 (absent, a negative claim) (Sec 4.1).
2. Source priors (Sec 4.2): false positive rate phi0_k ~ Beta(alpha0,1, alpha0,0); sensitivity phi1_k ~ Beta(alpha1,1, alpha1,0). The alpha hyperparameters encode prior belief, for example low alpha0,1 and high alpha0,0 mean "sources rarely invent values".
3. Truth prior: theta_f ~ Beta(beta1, beta0); t_f ~ Bernoulli(theta_f).
4. Observation: o_c ~ Bernoulli(phi^{t_f}_{s_c}), so a true fact is reported with the source's sensitivity and a false fact with its false positive rate (Sec 4.3).
5. Collapsed Gibbs sampling (Eq 2, Algorithm 1): p(t_f = i | t_-f, o, s) is proportional to beta_i * prod over c in C_f of (n^-f_{s_c,i,o_c} + alpha_{i,o_c}) / (n^-f_{s_c,i,1} + n^-f_{s_c,i,0} + alpha_{i,1} + alpha_{i,0}), where n counts the source's claims of each (truth, observation) type excluding fact f.
6. Truth probability is the fraction of samples with t_f = 1 after burn-in; threshold 0.5 by default (Sec 5).
7. Source quality by MAP (Sec 5.3): sensitivity(s) = (E[n_s,1,1] + alpha1,1) / (E[n_s,1,0] + E[n_s,1,1] + alpha1,0 + alpha1,1); specificity(s) = (E[n_s,0,0] + alpha0,0) / (E[n_s,0,0] + E[n_s,0,1] + alpha0,0 + alpha0,1).
8. Each sampling iteration is linear in the number of claims; LTMinc keeps the counts and samples only new facts (Sec 5.4).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Book data | 1,263 books, 2,420 facts, 48,153 claims, 879 sources, 100 labeled books | Sec 6.1 |
| Movie data | 15,073 movies, 33,526 facts, 108,873 claims, 12 sources, 100 labeled | Sec 6.1 |
| Priors used | alpha0 = (10, 1000) book, (100, 10000) movie; alpha1 = (50, 50); beta = (10, 10) | Sec 6.1 |
| Book, threshold 0.5 | LTM precision 1.000, recall 0.995, FPR 0.000, accuracy 0.995, F1 0.997 | Table 7 |
| Book baselines | 3-Estimates and Voting: precision 1.000, recall 0.863, accuracy 0.880, F1 0.927; TruthFinder precision 0.880, recall 1.000, FPR 1.000, accuracy 0.880 | Table 7 |
| Movie, threshold 0.5 | LTM 0.943 precision, 0.908 recall, 0.150 FPR, 0.892 accuracy, 0.925 F1; LTMinc 0.897 accuracy, 0.928 F1 | Table 7 |
| Movie baselines | 3-Estimates 0.852 accuracy; Voting 0.821; TruthFinder 0.731 (predicts everything true) | Table 7 |
| Baseline thresholds | TruthFinder best near 0.95; Voting and 3-Estimates best near 0.2 on book and 0.4 to 0.5 on movie | Sec 6.2.1 |
| Robustness to priors | accuracy near 1 until assumed source quality below 0.6; falls to about 0.5 at specificity 0.3 or sensitivity 0.1 | Fig 4 |
| Convergence | accuracy 0.85 after 7 iterations, converged by 50 | Fig 5 |
| Runtime | linear in claims, R squared 0.9913 | Fig 6 |
| Movie source quality (sens / spec) | imdb 0.912 / 0.899, netflix 0.894 / 0.935, fandango 0.500 / 0.990, flixster 0.584 / 0.911 | Table 8 |

## Claims we can test against
1. A one-number source score cannot distinguish an over-claiming source from a cautious one (Table 6 example).
2. TruthFinder with default threshold labels every claim true on multi-valued data (Table 7, recall 1.000, FPR 1.000).
3. LTM reaches 0.995 accuracy on book authors against 0.880 for voting (Table 7).
4. Results are stable for a wide range of priors as long as assumed quality stays above 0.6 (Fig 4).
5. Negative claims (a source omitting a value) carry signal and must be modeled, not ignored (Sec 4.1).
