# What Evidence Do Language Models Find Convincing? (Wan, arXiv 2024)

- URL: https://arxiv.org/abs/2402.11782
- PDF: pdf/convincing-evidence-wan-2024.pdf
- Status: fetched in full
- Why it matters for source trust: it measures which document features sway a model when two retrieved sources disagree, and finds that relevance to the question wins and credibility cues barely register.

## What it says
The authors build ConflictingQA, a set of controversial questions where real web pages argue for both sides (Section 3). They ask a model to pick a side given one "yes" page and one "no" page, and compute a win rate per page (Section 4.1). Features that humans use to judge credibility, such as readability, unique token count, or the presence of references, show no correlation with win rate (Section 4.3, Figure 4). Embedding similarity between the page and the question correlates strongly for every model except GPT-4 (Section 4.3). Adding sentences that restate the question's keywords raises a page's win rate; adding scientific tone or references does not help and can hurt (Section 4.4, Figure 2). Humans rate the same pages differently from the models (Figure 3). The authors suggest training on trusted sources so that models learn credibility cues (Section 5).

## Method
1. GPT-4 writes controversial yes/no questions; GPT-3.5 writes a stance statement for each side (Section 3).
2. Google search returns the top 20 pages per stance; jusText extracts text; claude-instant-v1 and GPT-4 label each page's stance and keep only pages where both agree (Section 3).
3. A TAS-B retriever filters paragraphs: a 512-token window scoring under 95 is removed (Section 3).
4. Win rate: WR(p_yes, q) = mean over p_no in P_q,no of 1[f(p_yes, p_no, q) = yes], averaged over both orderings, kept only for pages with at least 5 comparisons (Section 4.1).
5. Models: LLaMA-2 Chat, Vicuna v1.5, WizardLM v1.2, GPT-4, Claude v1 Instant (Section 4.2).
6. Correlate win rate with page features; then perturb pages (relevance edits vs style edits) and measure the win rate change (Sections 4.3 and 4.4).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Questions in ConflictingQA | 238 | Table 2 |
| Paragraphs in ConflictingQA | 2,208 | Table 2 |
| Average paragraph length | 365.01 words | Table 2 |
| Paragraphs with at least 5 comparisons | 912 | Table 2 |
| Average comparisons per paragraph | 6.54 | Table 2 |
| Pages by top-level domain | .com 527, .org 175, .gov 59, .edu 57, .net 12 | Table 3 |
| Readability and unique token count vs win rate | no correlation (n = 242) | Section 4.3, Figure 4 |
| Embedding similarity vs win rate | strong positive for all models except GPT-4 | Section 4.3, Figure 4 |
| Relevance perturbations | raise win rate; style perturbations neutral or negative, changes within plus or minus 0.4 | Section 4.4, Figure 2 |

## Claims we can test against
1. A page that repeats the query's words will be chosen over a better sourced page that does not; a lexical-overlap check on our ranking will reveal this.
2. Adding citations or a formal register to a document will not raise the chance the model follows it.
3. Credibility must come from outside the text (source metadata or a reliability score), since the model does not read it off the page.
