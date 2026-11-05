# Resolving Conflicts in Heterogeneous Data by Truth Discovery and Source Reliability Estimation (Li, SIGMOD 2014)

- URL: https://doi.org/10.1145/2588555.2610509
- PDF: not downloaded (paywalled; the ACM page and every author or university mirror tried returned HTML, Semantic Scholar lists no open-access PDF)
- Status: abstract only
- Why it matters for source trust: casts truth discovery as one optimization over source weights and truths, which lets one method handle numbers and categories in the same table.

## What it says
The abstract describes CRH (Conflict Resolution on Heterogeneous data). Truths and source reliability are two sets of unknowns. The method minimizes the overall weighted deviation between the truths and the multi-source observations, with each source's deviation weighted by its reliability. Different loss functions capture different data types, so continuous and categorical attributes are handled in one objective. Experiments on weather, stock, flight and simulated data are reported. No result numbers are available from the abstract.

## Algorithm
Only the abstract was available. The description below is the secondary account in the survey by Li et al. 2016 (pdf/truth-discovery-survey-li-2016.pdf, Sec 2.2.2, Eq 3), not the paper itself.
1. Objective (survey Eq 3): arg min over {w_s}, {v_o*} of sum over o of sum over s of w_s * d(v_os, v_o*), where d is 0-1 loss for categorical data and L2 (squared) distance for continuous data.
2. Coordinate descent: fix weights and solve for truths (weighted vote for categorical, weighted mean or median for continuous), then fix truths and solve for weights, repeat to convergence.
3. The weight update form w_s = -log(loss_s / sum over s' of loss_s') is stated in the task brief and in later secondary sources; it is not verifiable from the abstract and must be checked against the full paper before citing.

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Datasets | weather, stock, flight, simulated | abstract |

## Claims we can test against
1. A single weighted-deviation objective handles continuous and categorical attributes together (abstract).
2. Source reliability and truths are solved jointly, not sequentially (abstract).
