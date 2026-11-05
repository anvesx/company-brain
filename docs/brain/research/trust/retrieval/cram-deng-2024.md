# CrAM: Credibility-Aware Attention Modification in LLMs for Combating Misinformation in RAG (Deng, AAAI 2025)

- URL: https://arxiv.org/abs/2406.11497
- PDF: pdf/cram-deng-2024.pdf
- Status: fetched in full
- Why it matters for source trust: it uses a per-document credibility score to scale attention weights at inference time, with no training, so low-credibility documents get less influence instead of being dropped.

## What it says
Credibility scores are already available from retrievers or source metadata, but models ignore them in the prompt (Section 1). CrAM multiplies attention weights by a normalized credibility score on a chosen set of heads, so a document scored low contributes less to every generated token (Section 3.1). Heads are picked by measuring how much modifying each one lowers the probability of the wrong answer (Section 3.2). With one misinformation document among five, CrAM raises exact match on NQ by 7 to 21 points and on TriviaQA by 11 to 32 points over plain RAG, depending on the model (Table 1). With scores produced by GPT-3.5 instead of oracle scores, CrAM still beats excluding low-scored documents (Table 2). Applying the modification to all heads instead of selected heads hurts (Table 3). The abstract reports over 20 percent improvement on average and a lead over the fine-tuned CAG baseline.

## Method
1. Normalize document scores to [0, 1]: for token k in document d_i, s_bar_k = (s_i minus min(S)) / (max(S) minus min(S)); tokens outside the documents get 1 (Section 3.1).
2. For each chosen attention head h, rescale the attention row: (A_h)*_k = Norm((A_h)_k elementwise times s_bar), with l1 normalization so the row still sums to 1 (Section 3.1, Equation 1).
3. Choose heads by indirect effect: IE_h = P0 minus P1, where P0 = P(wrong answer | x, D) and P1 is the same probability after modifying head h with the misinformation document set to score 0 and all others to 1 (Section 3.2, Equation 2).
4. Average IE_h over 100 data points, rank heads, keep the top-ranked ones; the count is chosen on a 100-point validation set (Sections 3.2 and 4.1).
5. Setup: NQ and TriviaQA; Llama2-13B, Llama3-8B, Qwen1.5-7B; 4 high-credibility documents from Wikipedia via bge-large plus bge-reranker; up to 3 misinformation documents written by gpt-3.5-turbo-0125; scores either ideal (10 vs 1) or assigned by GPT-3.5 (Section 4.1).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Exact match, NQ / TriviaQA, 4 good plus 1 bad document, ideal scores, Qwen1.5-7B | Naive RAG 10.50 / 25.00, Prompt 12.20 / 27.40, CrAM 29.10 / 52.90 | Table 1 |
| Same, Llama2-13B | Naive RAG 11.90 / 28.00, CrAM 33.60 / 59.90 | Table 1 |
| Same, Llama3-8B | Naive RAG 16.00 / 36.80, Prompt 29.90 / 53.50, CrAM 36.90 / 64.40 | Table 1 |
| Clean 4-document Naive RAG for reference | Qwen 27.60 / 55.30, Llama2 28.90 / 62.50, Llama3 33.10 / 64.30 | Table 1 |
| GPT-3.5 assigned scores, Llama3-8B | Exclusion 26.60 / 57.70, CrAM 30.70 / 62.20 | Table 2 |
| GPT-3.5 assigned scores, Qwen1.5-7B | Exclusion 21.60 / 49.50, CrAM 23.10 / 52.10 | Table 2 |
| Modifying all heads instead of selected heads, Llama3-8B | minus 14.5 EM on NQ, minus 12.9 on TriviaQA | Table 3 |
| One misinformation document, Naive RAG drop on TriviaQA | more than 27.5 points for all three models | Table 3 |
| Head-selection sample size sensitivity | at most 4 points EM difference | Figure 5 |
| CrAM vs fine-tuned CAG-13B | higher F1 with 1 to 3 misinformation documents | Figure 3 |

## Claims we can test against
1. One planted document among five cuts plain RAG exact match by more than half on NQ (Table 1).
2. Downweighting by attention beats dropping documents when the credibility scores are noisy (Table 2).
3. The method needs head selection; a uniform modification is worse than doing nothing on some settings (Table 3).
