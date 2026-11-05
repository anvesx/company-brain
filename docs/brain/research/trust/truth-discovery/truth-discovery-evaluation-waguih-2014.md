# Truth Discovery Algorithms: An Experimental Evaluation (Waguih, arXiv 2014)

- URL: https://arxiv.org/abs/1409.6428
- PDF: pdf/truth-discovery-evaluation-waguih-2014.pdf
- Status: fetched in full
- Why it matters for source trust: the only side-by-side run of 12 methods on shared code; it shows no single method wins and that the share of true claims decides who wins.

## What it says
The authors reimplement 12 truth discovery algorithms (Majority Voting, TruthFinder, Cosine, 2-Estimates, 3-Estimates, SimpleLCA, GuessLCA, AccuSim, Depen, Accu, AccuNoDep, LTM, MLE) and build a synthetic generator that controls source coverage, conflict distribution and the share of true claims per source (Table 4). On synthetic data they vary the ground-truth distribution from fully pessimistic (80 percent of sources always wrong) to fully optimistic (Sec 3.1). On five real datasets (Book, Flight, Weather, Population, Biography) the winner changes each time (Table 5). The abstract states that none of the methods constantly outperforms the others in precision, so a one-fits-all approach does not seem achievable. Majority voting stays within a few points of the best and is 9 to 120 times faster (Sec 4). arXiv 1409.6428, 2014.

## Algorithm
This is an evaluation paper; the procedure is the benchmark design.
1. Synthetic generator parameters (Table 4): number of data items D (1,000; 100 to 10,000), source coverage (U25, U75 uniform; E exponential), ground-truth distribution per source (R random; U25, U75; FP fully pessimistic: 80 percent of sources always false; FO fully optimistic: 80 percent always true; 80P: 80 percent of sources give 20 percent true claims; 80O: 80 percent of sources give 80 percent true; E exponential), distinct-value distribution per item (U, E), distinct values per item (2 to 20).
2. Run each algorithm with its published parameters; record precision, accuracy, recall, specificity, iterations, time, memory (Sec 3, Table 5).
3. Real datasets: Book (877 sources, 33,235 claims, 1,263 objects, gold standard 100 objects = 7.91 percent), Flight (38 sources, 2,864,985 claims, gold 7.76 percent), Weather (16 sources, 365,890 claims, gold 74.4 percent), Population (4,264 sources, 49,955 claims, gold 0.702 percent), Biography (771,132 sources, 10,862,648 claims, gold 0.069 percent) (Table 5).
4. Mimic real datasets synthetically with complete ground truth to check that gold-standard samples are representative (Sec 3.3, Fig 4).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Book precision | 3-Estimates 0.9935 (42 iterations), 2-Estimates 0.9812, DEPEN 0.9814, Voting 0.9804, TruthFinder 0.9777, LTM 0.8551 after 500 iterations; MLE 1.0 on a reformatted version | Table 5 |
| Book accuracy | AccuSim 0.9516 best; Voting 0.8664 | Table 5 |
| Flight precision | ACCU 0.9111 best, AccuSim 0.9049, Cosine 0.8825, Voting 0.8205, 3-Estimates 0.7028, SimpleLCA 0.6802 | Table 5 |
| Flight cost | ACCU about 120 times slower than Voting for +0.0906 precision | Sec 3.3 |
| Weather precision | TruthFinder 0.6443 best, Voting 0.6305, AccuSim 0.5079 and ACCU 0.5231 worst; average 0.6132 | Table 5, Sec 3.3 |
| Population precision | AccuNoDep 0.8538 best, TruthFinder 0.8505, Voting 0.8206, 2-Estimates 0.6777 | Table 5 |
| Biography precision | 2-Estimates 0.7091 best, Voting 0.7068; DEPEN, ACCU, AccuSim exceeded limits; LCA models produced NaN | Table 5 |
| Optimistic synthetic | all methods within 95 percent intervals [0.9897, 0.9934] for FO and [0.9732, 1] for 80O | Sec 3.3 |
| Weather matches a pessimistic scenario | real precision 0.6134 plus or minus 0.0489 matches synthetic GT = U35 (35 percent true claims) | Sec 3.3, Fig 4b |
| Scale limits | LCA and MLE not feasible and DEPEN, ACCU, AccuSim exceed memory above 5,000 sources | Sec 4 |
| Speed | Voting is 9 (TruthFinder) to 120 (ACCU) times faster than the others | Sec 4 |
| TruthFinder tuning | Book precision maximized at delta = 0.001; runtime 435 ms to 526 ms | Sec 3.1 |

## Claims we can test against
1. No method wins on all five real datasets; the best method differs per dataset (Table 5).
2. When most sources are unreliable and items have few conflicting values, every method is near random (Sec 4, conclusion point 3).
3. When sources are mostly right, all methods are within 1 percent of each other (Sec 3.3, optimistic intervals).
4. Similarity-aware methods (ACCU, AccuSim) fall below voting on numeric weather data where values are naturally close (Sec 3.3).
5. Copy-detection methods (DEPEN, ACCU, AccuSim) do not scale past a few thousand sources (Sec 4).
6. 3-Estimates oscillates around 0.50 in pessimistic scenarios and needs 42 iterations on Book (Sec 3.1, Table 5).
