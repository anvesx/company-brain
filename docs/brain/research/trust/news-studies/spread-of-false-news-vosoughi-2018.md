# The spread of true and false news online (Vosoughi, Roy, Aral, Science 2018)

- URL: https://doi.org/10.1126/science.aap9559
- PDF: pdf/spread-of-false-news-vosoughi-2018.pdf
- Status: fetched in full
- Why it matters for source trust: popularity and reach on social media are not a proxy for truth; false stories spread farther and faster than true ones.

## What it says
The authors traced about 126,000 rumour cascades on Twitter from 2006 to 2017, spread by about 3 million people in more than 4.5 million tweets. Each rumour was labelled true or false by six fact-checking organisations that agreed 95 to 98% of the time. Falsehood spread farther, faster, deeper and more broadly than truth in every category, most of all in politics. A false story was 70% more likely to be retweeted than a true one. Truth took about six times as long to reach 1,500 people. The people who spread false news had fewer followers and were less active and less often verified, so the effect is not explained by influential accounts. False news was more novel and drew surprise and disgust in replies. Bots spread true and false news at the same rate, so humans drive the difference.

## Method
1. Collect tweets that link to stories investigated by snopes.com, politifact.com, factcheck.org, truthorfiction.com, hoax-slayer.com and urbanlegends.about.com; keep the veracity verdict (p. 1 to 2).
2. Build retweet cascades for each rumour: about 126,000 cascades; politics is the largest topic at about 45,000 (Fig. 1F).
3. Measure each cascade's size (unique users), depth (retweet hops), maximum breadth and structural virality; compare true and false by complementary cumulative distributions (Fig. 2).
4. Fit a logistic regression for retweet probability on veracity, controlling for follower and followee counts, account age, activity and verification (Fig. 4B).
5. Measure novelty with information uniqueness, Kullback-Leibler and Bhattacharyya distance against tweets the user saw in the prior 60 days; code replies for emotion (Fig. 4D, 4F).
6. Robustness: a second sample of 13,240 cascades labelled by three students with 90% agreement and Fleiss kappa 0.88; remove bot accounts with a detection algorithm and rerun (p. 5).

## Numbers to cite
| Claim | Value | Where |
| --- | --- | --- |
| Corpus | about 126,000 cascades, about 3 million people, more than 4.5 million tweets, 2006 to 2017 | Abstract, p. 1 |
| Fact-checker agreement | 95 to 98% across six organisations | p. 2 |
| Retweet odds | falsehood 70% more likely to be retweeted | p. 4, Fig. 4B |
| Speed to 1,500 people | truth about six times slower than falsehood | Fig. 2F |
| Speed to depth 10 | truth about 20 times slower | Fig. 2E |
| Reach | truth rarely beyond 1,000 people; top 1% of false cascades reach 1,000 to 100,000 | Fig. 2B |
| Political false news | reached 20,000 people nearly three times faster than other false news reached 10,000 | Fig. 3F |
| Novelty | information uniqueness K-S statistic 0.457 | Fig. 4D |
| Robustness sample | 13,240 cascades, 90% agreement, Fleiss kappa 0.88 | p. 5 |

## Claims we can test against
1. Share counts, retweets and reach must not raise a trust score; they correlate with falsehood.
2. Spreader follower counts do not explain false-news reach, so author popularity is a poor trust signal.
3. Novelty and strong emotion in reactions are warning signs, not credibility signals.
4. Political claims need stricter checks than other topics because false political news spreads fastest.
