# Knowledge-Based Trust: Estimating the Trustworthiness of Web Sources (Dong, PVLDB 2015)

- URL: http://www.vldb.org/pvldb/vol8/p938-dong.pdf
- PDF: pdf/knowledge-based-trust-dong-2015.pdf
- Status: fetched in full
- Why it matters for source trust: scores a web source by the correctness of the facts it states, not by its links, and separates extractor mistakes from source mistakes.

## What it says
Knowledge-Based Trust (KBT) defines the trustworthiness of a web source as the probability that a fact it states is correct (Sec 1). Facts are (subject, predicate, object) triples pulled by automatic extractors, so an error can come from the page or from the extractor. A single-layer model that treats each (page, extractor) pair as a source cannot tell these apart (Sec 2.2). The multi-layer model (Sec 3) adds a latent variable for whether each extraction is correct, and estimates source accuracy and extractor precision and recall jointly. SplitAndMerge (Sec 4) picks the granularity of a source (page, site, or group) so that large sites are split and tiny pages are pooled. The method is run on 2.8 billion triples and yields trust scores for 119 million pages and 5.6 million websites (Sec 5). KBT and PageRank disagree in useful ways: gossip sites rank high on PageRank and low on KBT (Sec 5.4.1). PVLDB vol 8 no 9, pages 938 to 949.

## Algorithm
1. Input: triples extracted by extractor e from source w, with the extracted value v for data item d (Sec 2.1).
2. Single-layer baseline (Sec 2.2): treat each (w, e) pair as a source and run ACCU or POPACCU from Dong 2009 and 2013; this confuses extractor and source errors.
3. Multi-layer model (Sec 3): latent C_wdv (does w really state v for d), latent V_d (true value), parameters A_w (source accuracy), P_e and R_e (extractor precision and recall), with Q_e derived. Defaults when no data: A_w = 0.8, R_e = 0.8, Q_e = 0.2 (Sec 3.3).
4. Extraction layer: each extractor votes on whether w states v (presence votes, Table 3); the vote count passes through a sigmoid to give Pr(C_wdv) (Sec 3.3.1).
5. Source layer: given Pr(C_wdv), run accuracy-weighted voting over sources to get Pr(V_d = v); confidence-weighted version in Sec 3.3.3 avoids treating C as observed.
6. Update A_w as the mean probability of the values w states; update P_e, R_e from the extractor's agreement with inferred C (Sec 3.3.4). Iterate; probabilities are stable after the second iteration (Sec 5).
7. SplitAndMerge (Sec 4): if a source has more than M triples, split it (by predicate, then by other keys); if it has fewer than m, merge it with its parent (page into website). Defaults m = 5, M = 10,000.
8. KBT of a source = A_w after convergence; only sources with at least 5 correctly extracted triples get a score (Sec 5.4).
9. Evaluation metrics: calibration buckets of predicted vs real accuracy, weighted deviation WDev, and AUC-PR (Sec 5.2).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Corpus | 2.8B triples from 2B+ webpages, 16 extractors, 40M extraction patterns | Sec 5.3.1 |
| Long tail | 74 percent of URLs contribute fewer than 5 triples; 48 percent of extraction patterns extract fewer than 5 | Sec 5.3.1, Fig 5 |
| Head | 26 URLs each over 50K triples, 15 websites each over 100M triples, 43 patterns each over 1M | Sec 5.3.1 |
| Scored sources | KBT for about 119M webpages and 5.6M websites out of 2B+ pages and 26M sites | Sec 5.4 |
| KBT distribution | peak at 0.8; 52 percent of websites have KBT over 0.8 | Sec 5.4, Fig 7 |
| Type-error triples | MultiLayer+ gives probability below 0.1 to 80 percent of them and above 0.7 to only 8 percent | Sec 5.3.2, Fig 6 |
| Correct Freebase triples | probability below 0.1 for 26 percent, above 0.7 for 54 percent | Sec 5.3.2 |
| Low PageRank, high KBT | of 100 sites with KBT above 0.9, 85 judged trustworthy by hand; only 20 of those 85 have PageRank over 0.5 | Sec 5.4.1 |
| High PageRank, low KBT | 14 of 15 gossip sites are in the top 15 percent by PageRank; all 15 are in the bottom 50 percent by KBT | Sec 5.4.1 |
| SplitAndMerge cost | splitting big extractors speeds extractor-quality computation by 8.8 times; overall time halves | Sec 5.3.4 |
| Defaults | A_w = 0.8, R_e = 0.8, Q_e = 0.2; m = 5, M = 10K | Secs 3.3, 5.3.4 |

## Claims we can test against
1. Separating extractor error from source error improves calibration and AUC-PR over a single-layer model (Table 6, Sec 5.3.3).
2. Link-based rank and fact-based trust are nearly independent signals (Fig 10, Sec 5.4.1).
3. Most sources sit in a long tail with fewer than 5 facts, so per-source accuracy cannot be estimated for them without pooling (Sec 5.3.1).
4. Two iterations are enough for the probabilities to stabilize (Sec 5).
5. Popular gossip and forum sites get low fact-based trust (Sec 5.4.1).
