# Fighting misinformation on social media using crowdsourced judgments of news source quality (Pennycook and Rand, PNAS 2019)

- URL: https://www.pnas.org/doi/10.1073/pnas.1806781116
- PDF: not downloaded (publisher and mirrors block automated download; full text read via Europe PMC XML, PMC6377495)
- Status: fetched in full
- Why it matters for source trust: shows that a simple trust rating from a balanced lay crowd tracks expert source ratings almost as well as the experts track each other.

## What it says
Lay people were asked how much they trust 60 news domains. Their average ratings were compared with ratings from professional fact-checkers. In Study 1 the crowd was recruited on Mechanical Turk. In Study 2 the crowd was a quota sample from Lucid. Both crowds rated mainstream outlets far above hyperpartisan and fake-news sites. A politically balanced crowd correlated 0.90 with fact-checkers. Democrats tracked fact-checkers more closely than Republicans. Most people did not recognise the fake and hyperpartisan sites, and ratings from people who did not know a site were mostly low, so dropping unfamiliar raters made the crowd less useful, not more.

## Method
1. Pick 60 domains per study: Study 1 used 20 mainstream, 22 hyperpartisan and 18 fake-news sites (Methods).
2. Ask each participant "Do you recognize the following websites?" (yes/no) and "How much do you trust each of these domains?" on a 5-point scale: Not at all, Barely, Somewhat, A lot, Entirely (Methods). Ratings are rescaled to 0 to 1.
3. Study 1: 1,010 MTurk participants. Study 2: 970 Lucid participants, quota matched to US demographics (Abstract, Methods). Study 2 added a question on whether the source produces truthful, relatively unbiased news.
4. Ask 14 professional fact-checkers the same questions; keep 8 who completed the task; inter-rater reliability ICC = 0.97 (Methods).
5. Compare mean crowd rating per domain with mean fact-checker rating per domain by Pearson correlation across the 60 domains, overall and within source type.
6. Repeat with ratings from only familiar participants, and build a politically balanced average by weighting Democrats and Republicans equally.

## Numbers to cite
| Claim | Value | Where |
| --- | --- | --- |
| Domains rated per study | 60 (20 mainstream, 22 hyperpartisan, 18 fake in Study 1) | Methods |
| Sample sizes | Study 1 n = 1,010 (MTurk); Study 2 n = 970 (Lucid) | Abstract |
| Fact-checker agreement | 8 raters, ICC = 0.97 | Methods, Results |
| Crowd vs fact-checkers, Study 2 | Democrats r = 0.92; Republicans r = 0.73; balanced r = 0.90 (df = 58) | Results, Fig. 3 |
| Within mainstream only, Study 2 | Democrats 0.51; balanced 0.32; Republicans -0.05 | Results |
| Fact-checker gap | mainstream 55.2 points above hyperpartisan, 61.3 above fake (0 to 100 scale) | Results |
| Familiarity, Study 1 | mainstream 81.6%, hyperpartisan 15.5%, fake 9.4% | Results |
| Familiarity, Study 2 | mainstream 59.5%, hyperpartisan 14.5%, fake 9.9% | Results |
| Unfamiliar ratings below midpoint | 87.0% (Study 1), 75.9% (Study 2) | Results |

## Claims we can test against
1. A politically balanced lay panel of a few hundred raters reproduces expert source rankings at r of about 0.9.
2. Crowd ratings separate mainstream from fake and hyperpartisan well, but rank outlets within the mainstream tier poorly (r 0.3 to 0.5 or lower).
3. Unfamiliar raters give low scores; excluding them removes the signal that catches unknown low-quality sites.
4. Partisan subgroups differ in accuracy, so a trust score should report rater composition.
