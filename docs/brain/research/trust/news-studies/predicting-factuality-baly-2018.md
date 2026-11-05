# Predicting Factuality of Reporting and Bias of News Media Sources (Baly, Karadzhov, Alexandrov, Glass, Nakov, EMNLP 2018)

- URL: https://arxiv.org/abs/1810.01765
- PDF: pdf/predicting-factuality-baly-2018.pdf
- Status: fetched in full
- Why it matters for source trust: first source-level classifier that predicts factuality and political bias of a whole outlet from its articles, Wikipedia page, Twitter profile, URL and traffic.

## What it says
The authors build a dataset of 1,066 news sites labelled by Media Bias/Fact Check for factuality (Low, Mixed, High) and bias (seven levels from Extreme-Left to Extreme-Right). They train an SVM on features from a sample of articles, the site's Wikipedia page, its Twitter profile, its URL and its Alexa rank. The full model reaches 65.48% accuracy on factuality against a 50.84% majority baseline. On 7-way bias it reaches 39.87% accuracy against 24.67%. Article text is the strongest single signal for bias. The Wikipedia page is the strongest for factuality. Having a Wikipedia page at all is informative. Twitter and traffic rank add little. Data and code are public at github.com/ramybaly/News-Media-Reliability.

## Method
1. Collect 1,066 sites from Media Bias/Fact Check with both a factuality and a bias label; merge Very High into High so factuality has 3 classes; keep 7 bias classes (Section 3, Table 3).
2. Crawl 10 to 100 articles per site (94,814 total); compute 141 stylistic, complexity, sentiment, morality and subjectivity features from Horne et al. 2018 on title and body separately; average per site (Section 4.1).
3. Wikipedia: flag whether a page exists (64% do); embed content, infobox, summary, categories and table of contents with averaged word vectors (Section 4.2).
4. Twitter: flag whether an account exists (94% do), verified, creation date, has location, URL match, follower/friend/status counts, description embedding (Section 4.3).
5. URL: orthographic features plus credibility flags such as https, blog host, top-level domain (Section 4.4). Traffic: reciprocal Alexa rank (Section 4.5).
6. Train SVM with RBF kernel, 5-fold cross-validation; report Macro-F1, accuracy and mean absolute error on the ordinal scale (Section 5).

## Numbers to cite
| Claim | Value | Where |
| --- | --- | --- |
| Dataset size | 1,066 sites | Table 3 |
| Factuality label counts | Low 256, Mixed 268, High 542 | Table 3 |
| Bias label counts | Extreme-Left 21, Left 168, Center-Left 209, Center 263, Center-Right 92, Right 157, Extreme-Right 156 | Table 3 |
| Factuality, full model | Macro-F1 59.91, Acc 65.48, MAE 0.41 | Table 4 |
| Factuality, majority baseline | Macro-F1 22.47, Acc 50.84 | Table 4 |
| Factuality, article body alone | Macro-F1 58.02, Acc 64.35 | Table 4 |
| Factuality, Wikipedia alone | Macro-F1 55.52, Acc 62.29 | Table 4 |
| Factuality, Twitter alone | Macro-F1 48.23, Acc 54.78 | Table 4 |
| Bias 7-way, full model | Macro-F1 37.50, Acc 39.87 (baseline 5.65 / 24.67) | Table 5 |
| Bias 3-way, full model | Macro-F1 61.31, Acc 68.86 (baseline 22.61 / 51.33) | Table 6 |
| Ablation | dropping Wikipedia hurts factuality most (Macro-F1 55.93); dropping articles hurts 7-way bias most (29.95) | Tables 4 and 5 |

## Claims we can test against
1. Source-level factuality can be predicted from public metadata at roughly 65% accuracy, 15 points above the majority class.
2. Presence and content of a Wikipedia page is the single best cheap predictor of factuality.
3. Writing style of articles predicts political bias better than any profile metadata.
4. Traffic rank carries no useful signal about factuality or bias.
