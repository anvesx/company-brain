# Astute RAG: Overcoming Imperfect Retrieval Augmentation and Knowledge Conflicts for Large Language Models (Wang, arXiv 2024)

- URL: https://arxiv.org/abs/2410.07176
- PDF: pdf/astute-rag-wang-2024.pdf
- Status: fetched in full
- Why it matters for source trust: it measures how often real web retrieval is wrong, then resolves conflicts by grouping consistent claims across sources and picking the group with the most reliable backing.

## What it says
The authors run real Google Search retrieval on 1,000 questions and find that about 70 percent of retrieved passages do not contain the true answer (Section 3, Figure 2). With Claude 3.5 Sonnet, 19.2 percent of questions show a knowledge conflict where the model alone and the model with retrieval disagree (Section 3, Figure 1). In those conflicts, the model's own knowledge is right 47.4 percent of the time and the retrieved passages are right 52.6 percent of the time, so neither side can be trusted by default (Section 3). Astute RAG asks the model to write down what it knows, labels each passage by source (retrieved or internal), then iteratively merges passages into consistent groups, flags conflicts, and drops irrelevant text (Section 4). The final answer is chosen by judging which group is most reliable, using source, cross-source confirmation, frequency, and thoroughness (Section 4). It beats every baseline on four models (Table 1) and is the only method that stays near the no-retrieval baseline when every retrieved passage is wrong (Section 5.2, Figure 6).

## Method
Algorithm 1, Section 4, with t = 1 iteration and m_hat = 1 internal passage by default (Section 5.1):
1. Adaptive internal knowledge: I = M(p_gen, q, m_hat). The model writes at most m_hat passages from its own knowledge, guided by constitutional-style instructions to admit when it does not know.
2. Initial set: D0 = E concatenated with I, where E is the retrieved passages. Source labels S0 mark each passage as external or internal.
3. Iterative consolidation: (D_j+1, S_j+1) = M(p_con, q, (D0, S0), (D_j, S_j)). The model groups passages that agree, notes groups that conflict, and removes irrelevant passages, keeping the source labels per group.
4. Answer finalization: a = M(p_ans, q, (D0, S0), (D_t, S_t)). The model proposes one answer per group, then picks the answer whose group is most reliable, considering source type, confirmation across sources, frequency, and detail.
5. Accuracy is measured by string match against gold answers (Section 5.1).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Retrieved passages without the true answer | about 70 percent | Section 3, Figure 2 |
| Questions with a knowledge conflict, Claude 3.5 Sonnet | 19.2 percent (model right and RAG wrong 9.1 percent, model wrong and RAG right 10.1 percent) | Section 3, Figure 1 |
| Who is right inside conflicts | internal 47.4 percent, external 52.6 percent | Section 3 |
| Overall accuracy, Claude 3.5 Sonnet | No RAG 54.5, RAG 55.5, USC 58.7, InstructRAG 58.8, Self-Route 58.1, Astute RAG 61.7 | Table 1 |
| Overall accuracy, Gemini 1.5 Pro | RAG 53.7, best baseline 57.6, Astute RAG 59.2 | Table 1 |
| Overall accuracy, Mistral-Large | RAG 54.7, USC 59.5, Astute RAG 59.9 | Table 1 |
| Relative gain over the best baseline | 6.85 percent Claude, 4.13 percent Gemini | Section 5.2 |
| Worst case, all 5 passages wrong (RGB) | RAG falls more than 50 points below No RAG; Astute RAG stays close to No RAG | Section 5.2, Figure 6 |
| Correct answer chosen on conflicting subset | about 80 percent | Section 5.3, Figure 8 |
| Cost vs gain | under 5 percent more tokens, over 11 percent better than RAG | Section 5.3, Figures 10 and 11 |
| LLM-judge audit of consolidation | grouping correct 98.2 percent, confidence assignment correct 95.0 percent | Section 5.3 |

## Claims we can test against
1. On live web retrieval, expect most passages to miss the answer; retrieval precision near 10 percent is where conflicts peak (Figure 3).
2. Grouping claims by agreement and keeping a source label per group raises accuracy; removing the labels lowers it on NQ, PopQA, and BioASQ (Table 3).
3. When all retrieved passages are wrong, a method that keeps an internal-knowledge passage in the pool should stay near the no-retrieval score; plain RAG will collapse.
