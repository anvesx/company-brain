# Fair and Balanced? Quantifying Media Bias through Crowdsourced Content Analysis (Budak, Goel, Rao, Public Opinion Quarterly 2016)

- URL: https://doi.org/10.1093/poq/nfw007
- PDF: pdf/fair-and-balanced-budak-2016.pdf
- Status: fetched in full
- Why it matters for source trust: measures outlet slant with blinded human ratings of individual articles, and finds the gap between mainstream outlets is small and comes from criticism rather than story choice.

## What it says
The authors collected 803,146 articles read in 2013 by Bing toolbar users from 15 US outlets. Classifiers picked out political news, and 749 trained Mechanical Turk workers rated 10,502 political articles on a five-point scale for how positive or negative they were toward each party. Each article got one blinded rating (title and text only) and one with the outlet shown. Mainstream outlets land close to neutral: the New York Times scores -0.05 and Fox News 0.11 on a -1 to 1 scale. Political blogs sit further out: Daily Kos -0.24, Breitbart 0.17. Slant shows up mostly as criticism of the other side rather than praise of one's own. Story selection is similar across outlets except for political scandals. Opinion pieces carry far more slant than descriptive news.

## Method
1. Collect articles viewed by at least 10 Bing toolbar users in 2013 from 13 top outlets plus Daily Kos and Breitbart: 803,146 articles (Data section).
2. Train a news-vs-not classifier (87% accuracy, 82% precision, 90% recall) and a political-vs-not classifier (87% accuracy, 91% precision, 81% recall); 340,191 news articles, 114,814 political ones (Data section).
3. Sample 2 political articles per outlet per day: 10,502 articles. Recruit 749 US MTurk workers with 1,000+ approved tasks, 98% approval and a political knowledge test.
4. Each article is rated by two workers, one blinded (title and text only) and one shown the outlet. Workers assign a topic (15 topics), news vs opinion, and answer "Is the article generally positive, neutral, or negative toward members of the Democratic Party?" and the same for Republicans, each on a five-point scale from very positive to very negative.
5. Combine the two party answers into one article slant score between -1 (left) and 1 (right); a one-step move on the scale is 0.5. Blinded and unblinded labels agree 81% of the time; median rating time over two minutes.
6. Average scores per outlet, per article type (news vs opinion), per topic; compare topic coverage shares across outlets.

## Numbers to cite
| Claim | Value | Where |
| --- | --- | --- |
| Corpus | 803,146 articles, 15 outlets, 2013 | Data section |
| Rated sample | 10,502 political articles, 749 workers | Data section |
| Classifier accuracy | news 87%, politics 87% | Data section |
| Outlet slant, mainstream | NYT -0.05, Fox 0.11 (gap 0.16; one scale step is 0.5) | Fig. 1a |
| Outlet slant, blogs | Daily Kos -0.24, Breitbart 0.17 | Fig. 1a |
| Opinion vs news on Fox | opinion 0.28, descriptive news 0.03 | Fig. 1b |
| Article distribution, NYT | about 20% net-left, 10% net-right, 70% neutral; about 1% beyond plus or minus 0.5 | Fig. 2 |
| Article distribution, Fox opinion | 63% net-right, 6% net-left, 31% neutral | Fig. 2 |
| Topic coverage correlation NYT vs Fox | 0.83 | Issue Filtering section, Fig. 5 |
| Scandal coverage | Democratic scandals 4% of NYT political articles vs almost 10% on Fox; Republican scandals 4% vs 1.5% | Issue Filtering section |
| Blinded vs unblinded agreement | 81% | Data section |

## Claims we can test against
1. Mainstream US outlets differ in slant by less than one step on a five-point scale; blogs differ by about one step.
2. Showing the outlet name changes about one rating in five, so blinded ratings are needed for a source score.
3. Slant lives in opinion content; descriptive news from the same outlet is near neutral.
4. Story selection is nearly the same across outlets (coverage correlation above 0.8) except for scandal coverage.
