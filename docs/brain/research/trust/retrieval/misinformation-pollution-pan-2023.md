# On the Risk of Misinformation Pollution with Large Language Models (Pan, Findings of EMNLP 2023)

- URL: https://arxiv.org/abs/2305.13661
- PDF: pdf/misinformation-pollution-pan-2023.pdf
- Status: fetched in full
- Why it matters for source trust: it shows that one model-written fake document per question, making up at most 0.1 percent of the corpus, cuts open-domain QA accuracy by up to 87 percent, and that majority voting across retrieved groups is the only defense that helps on every attack.

## What it says
The authors generate fake passages with GPT-3.5 in four ways and inject one per question into the retrieval corpus (Section 3, Section 4.1). The fakes are tiny relative to the corpus, under 0.02 percent for NQ and 0.1 percent for CovidNews (Table 1), yet they rank in the top results because they are written to match the question (Appendix Table 7). Exact match of retrieval-based QA drops by 14 to 54 percent with a dense retriever and by 20 to 87 percent with BM25 across the targeted attacks (Section 4.4). The strongest attack, Reit, rephrases the false claim ten ways inside one passage (Section 3). Reading more passages does not help (Figure 3). Three defenses are tried: a misinformation detector, a vigilant prompt, and a reader ensemble that splits retrieved passages into groups and takes a majority vote (Section 5). The detector works in-domain but fails out of domain; the prompt helps on one attack and hurts on another; voting raises exact match on all three attacks (Tables 3 and 4). One fake passage costs 1 to 4 cents to produce (Section 6).

## Method
1. Generation settings (Section 3): GenRead (model writes a passage from the question alone), CtrlGen (model writes a passage supporting a given false answer), Revise (model minimally edits a real passage to support the false answer), Reit (model restates the false claim ten times in different words).
2. Corpora (Section 4.1): NQ-1500, 1,500 NQ questions over Wikipedia 2018-12-30 with 21 million passages; CovidNews, 1,534 StreamingQA questions over 3.3 million passages. One fake document per question is injected.
3. Pipelines (Section 4.2): retrievers BM25 and DPR; readers FiD (up to 100 passages) and GPT-3.5 (10 passages).
4. Defense A, detection (Section 5): RoBERTa classifier trained on generated vs real passages, used to drop flagged passages.
5. Defense B, vigilant prompting (Section 5): add "Be aware that a minor portion of the passages may be designed to mislead you" to the reader prompt.
6. Defense C, reader ensemble (Section 5): split the top-K passages by relevance rank into k groups, run the reader on each group, final answer a_v = argmax over i of the sum over j of 1(a_i = a_j).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Injected fake documents as share of corpus | NQ at most 0.02 percent, CovidNews 0.1 percent | Table 1 |
| DPR plus FiD on NQ, exact match | clean 49.73; GenRead 47.40 (minus 5 percent); CtrlGen 42.27 (minus 14 percent); Revise 42.80 (minus 14 percent); Reit 30.53 (minus 39 percent) | Table 2 |
| DPR plus FiD on CovidNews | clean 23.60; GenRead minus 15 percent; CtrlGen minus 34 percent; Revise minus 18 percent; Reit minus 50 percent | Table 2 |
| BM25 plus FiD on NQ | clean 41.20; Reit 14.60 (minus 65 percent) | Table 2 |
| BM25 plus GPT-3.5 on NQ | clean 28.20; Reit 3.53 (minus 87 percent) | Table 2 |
| Range of drops across targeted attacks | 14 to 54 percent with DPR, 20 to 87 percent with BM25 | Section 4.4 |
| Detector AUROC in-domain | CtrlGen 99.7, Revise 91.4, Reit 99.8 | Table 3 |
| Detector AUROC out of domain | CtrlGen 64.8, Revise 50.7, Reit 52.6 | Table 3 |
| Defenses, DPR plus FiD 50 passages, exact match | CtrlGen 30.07 to 32.53 with prompt (plus 8 percent) and 33.33 with voting (plus 11 percent); Revise 27.33 to 25.47 with prompt (minus 7 percent) and 30.67 with voting (plus 12 percent); Reit 23.67 unchanged with prompt and 29.00 with voting (plus 23 percent) | Table 4 |
| Cost of one 200-word fake passage | 0.01 to 0.04 USD | Section 6 |

## Claims we can test against
1. A single targeted fake document per question is enough to cut exact match by a third or more; corpus share does not need to be large (Tables 1 and 2).
2. A fake that repeats its claim many times ranks higher and does more damage than a subtle edit (Reit vs Revise, Table 2).
3. Majority vote across independent passage groups gains 11 to 23 percent on every attack; a warning prompt is unreliable (Table 4).
4. A fake-text detector trained on one generator does not transfer to another (Table 3).
