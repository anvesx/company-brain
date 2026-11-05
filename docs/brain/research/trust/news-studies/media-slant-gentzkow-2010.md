# What Drives Media Slant? Evidence from U.S. Daily Newspapers (Gentzkow and Shapiro, Econometrica 2010)

- URL: https://doi.org/10.3982/ECTA7195
- PDF: pdf/media-slant-gentzkow-2010.pdf
- Status: fetched in full
- Why it matters for source trust: a fully automatic, text-only slant score for an outlet, calibrated against the known ideology of politicians, with evidence that slant follows readers more than owners.

## What it says
The authors measure newspaper slant by how often a paper uses phrases that are typical of Republican or Democratic members of Congress. They pick 1,000 two- and three-word phrases from the 2005 Congressional Record that best separate the parties, such as "death tax" versus "estate tax". A newspaper's slant is the ideology of the congressperson whose phrase mix it most resembles. They score 433 newspapers. Reader politics explain about 20 percent of the variation in slant. Owner identity explains about 4 percent and is not statistically significant. Papers choose slant close to what would maximise profit given their readers. The index compares papers to each other and to politicians, not to a truth benchmark.

## Method
1. Take the 2005 Congressional Record; count two- and three-word phrases per congressperson (Section 3.1).
2. Keep the 500 two-word and 500 three-word phrases with the highest chi-square statistic for party difference (1,000 phrases) (Section 3.1).
3. For each phrase p, regress its relative frequency on the congressperson's ideology score to get intercept a_p and slope b_p (eq. 2).
4. For newspaper n with phrase frequencies f_pn, slant = sum over p of b_p times (f_pn minus a_p), divided by sum over p of b_p squared (eq. 2).
5. Validate: among congresspeople the estimated and true ideology correlate 0.61 (explains 37% of variation); against Mondo Times user ratings of newspaper slant (Fig. 1).
6. Sample 433 newspapers (74% of US daily circulation); the average paper used the phrases over 13,000 times in 2005. Estimate a demand model on 290 papers with zip-code circulation data, then regress slant on reader ideology and on owner fixed or random effects; instrument reader ideology with religiosity.

## Numbers to cite
| Claim | Value | Where |
| --- | --- | --- |
| Phrase set | 500 two-word plus 500 three-word phrases, chi-square selected | Section 3.1 |
| Newspapers scored | 433, 74% of daily circulation | Section 3 |
| Phrase use per paper | over 13,000 occurrences in 2005, average paper | Section 3 |
| Index validity on Congress | correlation 0.61 with true ideology | Section 3.1 |
| Reader politics | explains about 20 percent of slant variation | Abstract, Section 5 |
| Owner identity | about 4 percent, not significant | Abstract, Section 5 |
| Demand sample | 290 newspapers with zip-code circulation | Section 4 |

## Claims we can test against
1. Partisan phrase frequency alone places an outlet on a left-right axis that agrees with human ratings.
2. Slant is a market response to the audience, so audience ideology predicts outlet slant.
3. Ownership is a weak predictor of slant; two papers with the same owner can differ.
4. The score is relative; it says nothing about factual accuracy.
