# Knowledge Conflicts for LLMs: A Survey (Xu, arXiv 2024)

- URL: https://arxiv.org/abs/2403.08319
- PDF: pdf/knowledge-conflicts-survey-xu-2024.pdf
- Status: fetched in full
- Why it matters for source trust: it names the three places a conflict can live (context vs memory, context vs context, memory vs memory) and lists every mitigation the field has tried, so we can place our own design on the map.

## What it says
A knowledge conflict is a disagreement between what the model was trained on and what it is given, or inside either of those. The survey splits conflicts into three types (Section 1, Figure 1): context-memory (Section 2), inter-context (Section 3), and intra-memory (Section 4). Context-memory conflicts come from temporal misalignment and from misinformation pollution, including prompt injection and sycophancy (Section 2.1). Inter-context conflicts come from misinformation and outdated information across retrieved documents (Section 3.1). Intra-memory conflicts come from training data bias, decoding, and knowledge editing (Section 4.1). Models have no stable rule for which side wins: some studies find over-reliance on memory, others find models follow coherent context, and the survey states "No definitive rule exists" (Section 2.2). The remark in Section 2.3 is the most useful point for us: existing fixes have contradictory goals (be faithful to context versus resist misinformation) because they do not separate the two causes of the conflict.

## Method
Survey, no experiments. Solutions are sorted as pre-hoc (before the conflict appears) or post-hoc (after it appears), see Figure 3. The listed strategies are:
1. Context-memory, faithful to context: KAFT, TrueTeacher, K-DIAL fine-tuning; OPIN prompting; context-aware decoding (CAD); CuQA, ICLM (Section 2.3).
2. Context-memory, discriminate misinformation: vigilant prompting plus detectors (Pan et al. 2023b), system prompts (Xu et al. 2023), query augmentation CAR (Weller et al. 2022), trained discriminators (Hong et al. 2023) (Section 2.3).
3. Context-memory, disentangle: DisentQA, which outputs a context answer and a memory answer separately (Section 2.3).
4. Context-memory, improve factuality: COMBO, CD2 (Section 2.3).
5. Inter-context, eliminate conflict: contradiction detectors (PCNN, Pielka et al. 2022, Wu et al. 2022), tool-based fact-checking (Chern et al. 2023), credibility signals with weak supervision (Leite et al. 2023) (Section 3.3).
6. Inter-context, robustness: discriminators (Hong et al. 2023) and CAR (Section 3.3).
7. Intra-memory: consistency losses, CRM, ConCoRD, and decoding fixes ITI and DoLa (Section 4.3).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Fabricated evidence attacks work whether written by humans or by a model | reported for Pan et al. 2023a | Section 3.2 |
| Models favor the most frequent piece of evidence in a set | reported for Jin et al. 2024a | Section 3.2 |
| Relevance of evidence matters more than style | reported for Wan et al. 2024 | Section 3.2 |
| Factual consistency of a model across paraphrases | 50 to 60 percent (Elazar et al. 2021) | Section 4.2 |
| GPT-4 self-inconsistency rate | 13 percent (Zhao et al. 2023b) | Section 4.2 |
| Largest inter-context dataset listed | Pan et al. 2023a, 52,189 items | Table 1 |
| ConflictingQA size | 238 items, inter-context | Table 1 |
| Largest context-memory dataset listed | Xie et al. 2023, 20,091 items | Table 1 |

## Claims we can test against
1. Our retrieved corpus will show all three conflict types; we should log which type each disagreement is before choosing a fix.
2. A fix tuned to "trust the context" will make misinformation worse, and a fix tuned to "resist the context" will make stale memory worse; both need the cause label first (Section 2.3 remark).
3. Models pick the most frequent claim in a set, so repeated or copied documents will sway answers unless we deduplicate by source (Section 3.2).
