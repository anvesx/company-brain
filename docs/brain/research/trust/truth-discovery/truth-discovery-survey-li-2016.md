# A Survey on Truth Discovery (Li, SIGKDD Explorations 2016)

- URL: https://arxiv.org/abs/1505.02463
- PDF: pdf/truth-discovery-survey-li-2016.pdf
- Status: fetched in full
- Why it matters for source trust: one framework that covers every method above, plus the list of assumptions each method makes and where they break.

## What it says
Truth discovery resolves conflicts among multiple sources by estimating source reliability and truths together (Sec 1). The general principle: information from reliable sources counts more, and a source that often provides true information is reliable (Sec 2.1). Three families express this: iterative methods, optimization methods, and probabilistic graphical models (Sec 2.2). Sections 3.1 to 3.5 give a taxonomy by input data, source reliability, object, claimed value and output. Tables 2 and 3 compare methods (TruthFinder, AccuSim, AccuCopy, Investment, LTM, CRH, GTM and others) on data type, labeled truths, source dependency and enriched meaning. Section 5 lists open problems. SIGKDD Explorations vol 17 no 2; arXiv 1505.02463.

## Algorithm
1. General iterative loop (Sec 2.2.1): fix source weights, compute truths by weighted aggregation; fix truths, recompute weights; repeat to convergence.
2. Truth step, Investment as the example (Eq 1): vote(v) = (sum over s in S_v of w_s / |V_s|)^1.2, where |V_s| is the number of claims of source s.
3. Weight step (Eq 2): w_s = sum over v in V_s of vote(v) * (w_s / |V_s|) / sum over s' in S_v of w_s' / |V_s'|.
4. Optimization form (Eq 3, used by CRH and others): arg min over {w_s}, {v_o*} of sum over o of sum over s of w_s * d(v_os, v_o*); d is 0-1 loss for categorical and L2 for continuous data; solved by coordinate descent (Sec 2.2.2).
5. Probabilistic form (Eq 4, Fig 1): prod over s of p(w_s | beta) * prod over o of p(v_o* | alpha) * prod over s of p(v_os | v_o*, w_s). With a Gaussian, the truth is the mean and the weight is the precision (Sec 2.2.3).
6. Taxonomy (Sec 3): input data (3.1: duplicates, formats, structured vs unstructured, streaming, labeled truths); source reliability (3.2: consistency assumption 3.2.1, independence assumption 3.2.2, fine-grained reliability 3.2.4, enriched meaning 3.2.5); object (3.3: difficulty, relations); claimed values (3.4: data type, ambiguity, hierarchy); output (3.5: measurement, explanation).
7. Source independence (Sec 3.2.2): assumes sources observe independently; equivalently, true information is likely shared and false information is likely different across sources. Copy detection in Dong et al. 2009 and 2010 relaxes this; correlated-source models use joint precision and recall; Twitter follower graphs can supply the correlation as input.

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Investment exponent | 1.2 in the vote function | Eq 1 |
| Method comparison | Tables 2 and 3 list which methods handle categorical, continuous, heterogeneous data, labeled truths, source dependency, enriched reliability | Sec 4 |
| CRH classification | heterogeneous data, no source dependency | Table 2 |
| Open problem: initialization | uniform weights make the first iteration identical to voting and bias results toward the majority | Sec 5 |

## Claims we can test against
1. Iterative, optimization and PGM formulations are three views of one principle and can be shown equivalent in cases (Sec 2.2, Sec 5 theoretical analysis bullet).
2. The source independence assumption fails under copying; methods without copy detection over-count shared false values (Sec 3.2.2).
3. Uniform weight initialization reproduces majority voting on the first pass and can lock in the majority when most sources are wrong (Sec 5).
4. Open issues listed: unstructured data with two layers of sources, object relations, source weight initialization, model selection and ensembles, convergence theory, efficiency, evaluation without ground truth (Sec 5).
5. The survey does not have a dedicated long-tail section; it cites long-tail truth discovery (Li et al. PVLDB 8(4) 2015) in its references only. Use KBT Sec 5.3.1 for long-tail numbers.
