# Truth Discovery with Multiple Conflicting Information Providers on the Web (Yin, IEEE TKDE 2008)

- URL: https://hanj.cs.illinois.edu/pdf/tkde08_xyin.pdf
- PDF: pdf/truthfinder-yin-2008.pdf
- Status: fetched in full
- Why it matters for source trust: the first iterative "trust the source, believe the fact" loop; every later truth discovery method is a variant of it.

## What it says
Websites give conflicting facts about the same object. Majority voting fails because many sites copy or are wrong together. TruthFinder computes two scores at once: the trustworthiness of a website and the confidence of each fact. A website is trustworthy if it gives many high-confidence facts. A fact is confident if it comes from trustworthy sites. Facts about the same object influence each other through an implication function. A dampening factor keeps confidence from going to 1 just because several mediocre sites agree, which the authors attribute to copying (Sec 3.1.3). The paper is TKDE vol 20 no 6, June 2008, pages 796 to 808; an earlier version appeared at KDD 2007.

## Algorithm
1. Start with uniform trustworthiness t(w) for all websites (Sec 3.2).
2. Website trustworthiness is the mean confidence of its facts: t(w) = sum over f in F(w) of s(f) / |F(w)| (Eq 1).
3. Fact confidence if sites were independent: s(f) = 1 - prod over w in W(f) of (1 - t(w)) (Eq 2).
4. Log scores make this additive: tau(w) = -ln(1 - t(w)) (Eq 3), sigma(f) = -ln(1 - s(f)) (Eq 4), so sigma(f) = sum over w in W(f) of tau(w) (Eq 5, Lemma 1).
5. Add influence of other facts about the same object: sigma*(f) = sigma(f) + rho * sum over f' with o(f') = o(f) of sigma(f') * imp(f' -> f) (Eq 6). rho in (0,1) weights the influence; imp is negative for conflicting facts.
6. Dampen and squash: s*(f) = 1 - e^(-gamma * sigma*(f)) with 0 < gamma < 1 (Eq 7); the final form is logistic, s(f) = 1 / (1 + e^(-gamma * sigma*(f))) (Eq 8), so negative sigma* still gives a valid probability.
7. Repeat steps 2 to 6. Stop when the relative change of the trustworthiness vector (1 minus cosine similarity) drops below 0.001 percent (Sec 3.2).
8. Matrix form: A has entries 1/|F(w_i)|, B has entries 1 or rho * imp (Eqs 10 and 11).
9. Domain-specific implication for book authors: imp(f1 -> f2) = sim(f1, f2) - base_sim, with sim = fraction of authors shared and base_sim = 0.5 (Sec 4.2.1); base_sim = 0.75 for movie runtimes (Sec 4.2.2).

## Numbers to cite
| Claim | Value | Where in paper |
| --- | --- | --- |
| Book dataset size | 1,265 CS books, 894 bookstores, 34,031 listings, 5.4 author sets per book on average | Sec 4.2.1 |
| Books with hand-checked truth | 100 | Sec 4.2.1 |
| TruthFinder accuracy on books | about 95 percent after the third iteration | Fig 6, Sec 4.2.1 |
| TruthFinder beats voting | higher than VOTING from the first iteration | Fig 6, Sec 4.2.1 |
| Dampening motivation | 5 sites with t = 0.6 would give s = 0.99 without gamma | Sec 3.1.3 |
| Stop threshold | 0.001 percent relative change; stops after 4 iterations on books | Sec 3.2, Fig 7 |
| Runtime on books | 8.73 s to precompute implications plus 4.43 s for four iterations; VOTING 1.22 s | Sec 4.2.1 |
| Largest bookstore accuracy | A1 Books provides 86 of the 100 books with accuracy 0.878 | Table 4, Sec 4.2.1 |
| Barnes and Noble | makes more errors on the 100 books than VOTING or TruthFinder | Table 3, Sec 4.2.1 |
| Movie runtimes | 603 movies, 100 checked against IMDB; TruthFinder 99 percent after three iterations; VOTING error rate more than twice TruthFinder | Sec 4.2.2, Fig 8 |
| Synthetic noise test | exact match 98.2 percent TruthFinder vs 90.5 percent VOTING | Sec 4.3 |
| Scaling | runtime grows 118 times for 100 times more objects | Fig 12, Sec 4.3 |

## Claims we can test against
1. Iterating trust and confidence beats one-shot majority voting on author lists (Fig 6).
2. Convergence takes about 4 iterations with relative change falling by about one order of magnitude per iteration (Fig 7).
3. Without dampening, a handful of 0.6-trust sources yields near-certain confidence (Sec 3.1.3 arithmetic).
4. Sources that Google ranks high are not the most accurate sources (Table 4).
5. The logistic form in Eq 8 never produces negative confidence even when all related facts conflict.
