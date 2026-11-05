# Not All Contexts Are Equal: Teaching LLMs Credibility-aware Generation (Pan, arXiv 2024)

- URL: https://arxiv.org/abs/2404.06809
- PDF: pdf/credibility-aware-generation-pan-2024.pdf
- Status: fetched in full
- Why it matters for source trust: it attaches a credibility label to every document in the prompt and fine-tunes the model to weigh documents by that label instead of treating them all the same.

## What it says
Off-the-shelf models, including ChatGPT, change their answers very little when a credibility note is added to each document (Section 3, Table 2). The authors define credibility-aware generation as y = LM(x, {[c_i, d_i]}), where each document d_i carries a credibility c_i (Section 2). They build training data by scoring sentences and documents with a retriever, binning the scores into high, medium, and low, and having GPT-3.5 write explanations that use the labels (Sections 3.1 and 3.2). They fine-tune LLaMA-2 7B and 13B and Mistral-7B on about 15,000 samples (Section 3.3, Appendix A.1). At test time credibility is Cred = min(rt_score(R, T), S), combining retrieval rank, timestamp, and a source-reliability level (Section 4.1). On the CAGB benchmark of seven tasks, the 7B model beats ChatGPT and LLaMA-2-70B on every task, with the largest gaps on noisy and polluted-news settings (Table 2). Dropping low-credibility documents entirely loses helpful information; keeping them with labels works better (Section 5.3.2, Figure 4).

## Method
1. Split each retrieved document into sentence-level and document-level units (Section 3.1).
2. Score each unit with a retriever; map the scores to three levels (high, medium, low) by equal count or equal interval binning (Section 3.1).
3. Ask GPT-3.5 to write a chain-of-thought explanation that cites the labels and reaches the gold answer; this replaces the bare answer as the training target (Section 3.2).
4. Instruction fine-tune with loss L = minus sum over i of log p(y_i | x, {[c_i, d_i]}, y_<i); 3 epochs, learning rate 1e-5, SPLADE retriever, 3-shot prompting, exact match metric (Section 3.3).
5. At inference, credibility per document: rt_score(R, T) = max(R minus floor(T / threshold), 1), where R is the retrieval-rank level and T is time since publication; Cred = min(rt_score(R, T), S) where S is the source reliability level (Section 4.1).
6. Benchmark CAGB: HotpotQA, 2WikiMHQA, MuSiQue, ASQA, RGB, EvolvingTempQA, NewsPollutedQA with controlled noise ratios (Table 1).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Training samples | about 15,000 | Appendix A.1 |
| CAGB noise ratios | HotpotQA 0.8, 2WikiMHQA 0.6 to 0.8, MuSiQue 0.9, RGB 0.2 to 0.8, EvolvingTempQA 0.4 to 0.8, NewsPollutedQA 0.5 to 0.75 | Table 1 |
| Time-sensitive setup | 3 relevant and 4 distracting documents per query | Section 4.3 |
| CAG-7B exact match | HotpotQA 0.509, 2Wiki 0.578, MuSiQue 0.340, ASQA 0.496, RGB 0.897, EvolvingTempQA 0.826, NewsPollutedQA 0.442 | Table 2 |
| CAG-13B exact match | 0.514, 0.604, 0.408, 0.525, 0.917, 0.829, 0.483 (same order) | Table 2 |
| ChatGPT with retrieval, no credibility | 0.334, 0.368, 0.194, 0.404, 0.773, 0.579, 0.231 (same order) | Table 2 |
| ChatGPT with retrieval plus credibility labels | 0.422, 0.402, 0.182, 0.440, 0.807, 0.673, 0.408 (same order) | Table 2 |
| LLaMA-2-70B on NewsPollutedQA | 0.430 without labels, 0.279 with labels (labels hurt) | Table 2 |
| CAG-7B vs same-size baselines on 2WikiMHQA | plus 26.6 points EM over LLaMA-2-7B, plus 28.2 over Vicuna-7B | Section 5.2 |
| Average EM of ChatGPT and LLaMA-2-70B on open-domain tasks | 41.5 percent and 44.1 percent | Section 5.2 |

## Claims we can test against
1. Adding a credibility label to the prompt of an untrained model gives small or negative changes; the gain needs fine-tuning (Table 2, LLaMA-2-70B row).
2. A fine-tuned 7B model with labels can match or beat a 70B model without them on noisy retrieval (Table 2).
3. Filtering out low-credibility documents before generation scores lower than passing them in with a low label (Figure 4).
