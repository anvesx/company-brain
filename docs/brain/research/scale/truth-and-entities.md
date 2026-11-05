# Truth discovery and entity resolution

Ten cards. Index and gap table: [README.md](README.md). Full source-trust cards: [../trust/truth-discovery](../trust/truth-discovery/README.md).

Terms. Knowledge Discovery and Data Mining (KDD) is a conference. Proceedings of the VLDB Endowment (PVLDB) is a journal.

### A Survey on Truth Discovery
- Li et al., SIGKDD Explorations, 2015. [arXiv 1505.02463](https://arxiv.org/abs/1505.02463).
- Finding: a taxonomy; iterate source weights and truths from uniform weights. Our spec has one method and no baseline.
- Number we use: none stated. Metric to add: accuracy and error rate against voting on the same claims.
- Spec: source-trust rules 2, 3, 7, 8.

### A Bayesian Approach to Discovering Truth from Conflicting Sources (LTM)
- Zhao et al., PVLDB, 2012. [arXiv 1203.0058](https://arxiv.org/abs/1203.0058).
- Finding: two-sided source quality (sensitivity and specificity) fitted by Gibbs sampling. A source that omits facts no longer looks as good as one that states false ones.
- Number we use: 0.995 accuracy on books against 0.880 for voting; runtime linear in claims.
- Spec: source-trust rule 7 keeps one accuracy per source.

### Knowledge-Based Trust (KBT)
- Dong et al., Google, PVLDB, 2015. [arXiv 1502.03519](https://arxiv.org/abs/1502.03519).
- Finding: separates extractor error from source error. Our spec counts LLM extraction errors against the source.
- Number we use: 119M pages scored.
- Spec: source-trust takes claims as given.

### Knowledge Vault
- Dong et al., Google, KDD 2014. [PDF](https://www.cs.ubc.ca/~murphyk/Papers/kv-kdd14.pdf). Not on arXiv.
- Finding: fuses 16 extractors with graph priors and gives calibrated confidence. Our scores are not probabilities.
- Number we use: 1.6B triples, 271M at confidence 0.9 or higher.
- Spec: none; no calibration step.

### On the Discovery of Evolving Truth
- Li et al., KDD 2015. [PDF](https://cse.buffalo.edu/~jing/doc/kdd15_evolve.pdf). Not on arXiv.
- Finding: incremental update with a smoothing factor for truths and a decay factor for source quality.
- Number we use: beats CRH by 3% in mean absolute error and 6.23% in root mean square error on weather data.
- Spec: source-trust rule 8 starts from priors each run; rule 5 decays claims only.

### Truth Discovery in Data Streams: A Single-Pass Probabilistic Approach
- Zhao, Cheng, Ng, HKUST, CIKM 2014. [PDF](https://cse.hkust.edu.hk/~wilfred/paper/cikm14a.pdf). Not on arXiv.
- Finding: one pass per claim with a Beta prior on source quality. Cost grows with the update, not the history.
- Number we use: none; the paper shows results only in figures.
- Spec: source-trust rule 8.

### A Survey of Blocking and Filtering Techniques for Entity Resolution
- Papadakis et al., 2019. [arXiv 1905.06167](https://arxiv.org/abs/1905.06167).
- Finding: token and q-gram blocking; meta-blocking prunes comparisons. Pair count grows as n squared without it.
- Number we use: none stated. Metrics to add: pair recall (PC), pair precision (PQ), reduction ratio (RR).
- Spec: entity-resolver rule 5 mentions an index but has no blocking design.

### Magellan: Toward Building Entity Matching Management Systems
- Konda et al., Wisconsin, WalmartLabs, PVLDB 2016. [PDF](http://www.vldb.org/pvldb/vol9/p1197-pkonda.pdf). Not on arXiv.
- Finding: a how-to guide plus tools; debug a learned matcher. We have hand rules and no labelled pairs.
- Number we use: debugging raised recall 34% for a 0.65% precision drop on a WalmartLabs product matcher.
- Spec: entity-resolver rules 1 to 3.

### Incremental Record Linkage
- Gruenheid, Dong, Srivastava, PVLDB 2014. [PDF](http://www.vldb.org/pvldb/vol7/p697-gruenheid.pdf). Not on arXiv.
- Finding: update clusters per insert, delete or change, and fix earlier merges. Our merges are final.
- Number we use: ran on 87 snapshots of about 5K records.
- Spec: entity-resolver rule 4 (lowest id survives).

### Splink: Free software for probabilistic record linkage at scale
- Linacre et al., Ministry of Justice, IJPDS 2022. [Page](https://ijpds.org/article/view/1794). Not on arXiv.
- Finding: Fellegi-Sunter model fitted by expectation maximisation, with m and u probabilities per field. Our thresholds are guessed.
- Number we use: 2 million downloads. The abstract gives no runtime numbers.
- Spec: entity-resolver rule 3.
