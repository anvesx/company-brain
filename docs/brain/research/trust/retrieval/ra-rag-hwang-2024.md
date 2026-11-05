# Retrieval-Augmented Generation with Estimation of Source Reliability (Hwang, arXiv 2024)

- URL: https://arxiv.org/abs/2410.22954
- PDF: pdf/ra-rag-hwang-2024.pdf
- Status: fetched in full
- Why it matters for source trust: it estimates a reliability score per source with no labels, by checking how often each source agrees with the weighted consensus, then retrieves only from the top reliable sources and combines their answers by weighted majority vote.

## What it says
Standard RAG retrieves by relevance only, so a source that writes relevant but false text wins (Section 1). RA-RAG partitions the corpus by source, retrieves per source, and answers per source (Section 3.2). Before deployment it runs fact-checking queries over all sources and iterates between a weighted majority vote on the answers and a per-source reliability score equal to the share of answers that match the vote (Section 4.2). At inference it walks sources in order of reliability and keeps the first kappa that return a relevant answer, then applies weighted majority voting over those answers after filtering misaligned responses with AlignScore and clustering paraphrases with an NLI model (Section 4.1). With up to 7 adversarial sources out of 9, RA-RAG stays within about 0.01 of an oracle that knows the true reliabilities, while plain RAG and majority vote fall sharply (Table A4). Selecting kappa = 4 sources cuts tokens by 99.1 percent at 1,000 sources with a small accuracy loss (Table 2). On real sources (two politicians' PolitiFact claims and one X account), the estimated reliability tracks the oracle within 0.08 (Table 3).

## Method
1. Partition the database D into sources S_1 to S_N. For query q, the per-source answer is y_i = G(q, R(q, S_i)) (Section 3.2).
2. Filter: f_align replaces y_i with IDK when AlignScore E(y_i; q, R(q, S_i)) is below a threshold tau (Section 4.1, Equation 2).
3. Cluster the remaining answers by mutual entailment with a DeBERTa-large NLI model (Section 4.1).
4. Weighted majority vote: y = argmax over clusters u of the sum over i of v_i times 1(f_align(y_i) = u) (Section 4.1, Equation 3).
5. Reliability estimation (Section 4.2, Equations 5 and 6): start with v_i = 1 for all sources; for M fact-checking queries, compute the weighted vote answer y_j for each query; set w_i = (number of queries where source i's filtered answer equals y_j) divided by (number of queries where source i's answer is not IDK); rescale v_i = N times w_i minus 1; repeat until the weights converge or eta iterations are reached.
6. kappa-RRSS (Section 4.1, Algorithm 1): iterate sources in descending v_i and keep the first kappa whose filtered answer is not IDK; vote only over those (Equation 4).
7. Setup (Section 5.1): NQ, TriviaQA, HotpotQA; sources simulated with reliability p_i from a Beta prior with mean 0.6 or an adversary-hammer prior (0.1 or 0.9) and coverage r_i = 0.6; 1,600 queries per dataset, 200 for reliability estimation and 1,400 for test; top-3 documents per source, kappa = 4; models Llama3-8B-Instruct, Phi3-mini, GPT-4o-mini, Llama2-7B; Contriever retriever; accuracy averaged over 10 trials.

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Queries per dataset | 1,600 (200 for reliability estimation, 1,400 for test) | Section 5.1 |
| NQ accuracy with 7 of 9 sources adversarial, Llama3-8B | RA-RAG 0.558, Oracle WMV 0.558, MV 0.327, Vanilla RAG 0.294, Robust RAG 0.201, no retrieval 0.253 | Table A4 |
| NQ accuracy with 1 adversary, Llama3-8B | RA-RAG 0.737, MV 0.740, Vanilla RAG 0.612 | Table A4 |
| TriviaQA accuracy with 7 adversaries, Llama3-8B | RA-RAG 0.722, MV 0.477, Vanilla RAG 0.544, Robust RAG 0.367 | Table A4 |
| HotpotQA accuracy with 7 adversaries, Llama3-8B | RA-RAG 0.557, MV 0.382, Vanilla RAG 0.472 | Table A4 |
| Majority vote failure point | degrades sharply once adversaries exceed four of nine | Section 5.2 |
| Stable kappa | performance stable from kappa = 4 | Section 5.3, Figure 4 |
| kappa-RRSS token savings, GPT-4o-mini, NQ | minus 2.6 percent at 5 sources, minus 32.3 percent at 10, minus 99.1 percent at 1,000 | Table 2 |
| kappa-RRSS accuracy cost at 1,000 sources | 0.780 without selection, 0.768 with | Table 2 |
| Relevance check matters | kappa-RSS 0.689 vs kappa-RRSS 0.768 at 1,000 sources | Table 1 |
| Real sources, estimated vs oracle reliability | Politician A 0.175 vs 0.165, Politician B 0.539 vs 0.606, User A 0.660 vs 0.738 | Table 3 |
| Real sources, claim counts | Politician A 388 claims (64 true), Politician B 104 (63 true), User A 244 posts (180 true) | Section 6.1 |
| Correlation of estimated and oracle reliability, User A | PCC 0.991, SRCC 0.992, both p under 0.001 | Section 6.2, Figure 5 |

## Claims we can test against
1. Agreement with the weighted consensus over a few hundred probe queries recovers source reliability without any labels, within about 0.08 of ground truth (Table 3).
2. Equal-weight majority vote is fine until about half the sources are bad, then collapses; weighted vote holds (Table A4, Section 5.2).
3. Consulting only the top 4 reliable and relevant sources loses about 1 point of accuracy and removes almost all the cost at scale (Table 2).
4. Reliability must be refreshed over time; the method is offline and misses a reliable source that suddenly turns bad (Limitations).
