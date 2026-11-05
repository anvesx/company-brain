# ClashEval: Quantifying the Tug-of-War Between an LLM's Internal Prior and External Evidence (Wu, NeurIPS 2024 Datasets and Benchmarks)

- URL: https://arxiv.org/abs/2404.10198
- PDF: pdf/clasheval-wu-2024.pdf
- Status: fetched in full
- Why it matters for source trust: it measures how often a model copies a wrong retrieved document, and shows the rate falls as the document gets more absurd and as the model's own confidence rises.

## What it says
The benchmark inserts a modified fact into a retrieved document and checks whether the model follows the document or its prior (Section 3). Six domains are used: drug dosages, news, Wikipedia dates, sports records, names, and locations (Section 3.1). Three metrics are defined: accuracy, prior bias (keeping a wrong prior when context is right), and context bias (adopting a wrong context when the prior is right) (Section 3.1). Every model adopts wrong context in a large share of cases, from 31 percent for Claude Opus to 63 percent for GPT-3.5 (Table 2). The more a fact is perturbed, the less often the model follows it (Section 4.3, Figure 3). The higher the model's token probability for its own answer, the less often it follows the context (Section 4.4, Figure 4). A simple fix, comparing calibrated token probabilities of the prior answer and the context answer, raises GPT-4o accuracy from 61.5 to 75.4 percent (Section 4.4.1, Table 3).

## Method
1. Collect 1,294 questions with a ground-truth answer and a reference document (Section 3.1, Table 1).
2. Perturb the answer inside the document: numeric values multiplied by 0.1 to 10.0; years shifted up to plus or minus 100 in 20-year steps; names and locations changed at slight, significant, and comical levels (Section 3.3).
3. Ask each model the question with and without the perturbed document; record the prior answer, the context answer, and the model's token probabilities (Section 3.3).
4. Metrics (Section 3.1): accuracy = fraction correct; prior bias = fraction where context was right but the model kept its wrong prior; context bias = fraction where the prior was right but the model took the wrong context.
5. Correction (Section 4.4.1): for each question compute the calibrated probability of the prior answer and of the context answer; answer with whichever has the higher calibrated probability.
6. Models: GPT-4o, GPT-3.5-turbo-0125, Llama-3-8B, Gemini 1.5 Flash, Claude Opus, Claude Sonnet (Section 3.3).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Questions, domains | 1,294 questions, 6 domains | Section 3.1 |
| Per-domain counts | drug dosage 249, news 238, dates 200, sports 191, names 200, locations 200 | Table 1 |
| Share of cases where prior was right but model chose wrong context | Opus 0.313, Sonnet 0.401, Gemini 0.490, GPT-4o 0.608, GPT-3.5 0.626, Llama-3 0.529 | Table 2 |
| Share where context was right but model kept wrong prior | Opus 0.042, Sonnet 0.051, Gemini 0.074, GPT-4o 0.041, GPT-3.5 0.057, Llama-3 0.041 | Table 2 |
| Claude Opus overall | accuracy 74.3 percent, context bias 15.7 percent, prior bias 2.1 percent | Section 4.1, Table 4 |
| GPT-4o overall | accuracy 0.615, context bias 0.304, prior bias 0.021 | Table 4 |
| Opus vs GPT-4o on wrong context | Opus follows wrong context about 30 percent less often | Section 4.3 |
| Slope of context preference vs prior probability | between minus 0.1 and minus 0.45 across models | Section 4.4, Figure 4 |
| Calibrated-probability fix, GPT-4o | accuracy 0.615 to 0.754, context bias 0.304 to 0.107, prior bias 0.021 to 0.085 | Table 3 |
| Calibrated-probability fix, GPT-3.5 | accuracy 0.539 to 0.701 | Table 3 |
| Calibrated-probability fix, Llama-3 | accuracy 0.500 to 0.649 | Table 3 |
| Adding 5 documents instead of 1 | accuracy lower, context bias lower | Section 4.2, Tables 6 and 7 |

## Claims we can test against
1. With one wrong retrieved document, a frontier model will copy it in roughly one third to two thirds of cases depending on the model (Table 2).
2. Small, plausible edits to a fact are the ones that get through; large edits are rejected (Figure 3). Our tests should use plausible perturbations, not absurd ones.
3. Logging the model's token probability for its own answer gives a usable signal for when to distrust the context (Figure 4, Table 3).
