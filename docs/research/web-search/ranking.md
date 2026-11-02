# How Google ranks, known versus folklore

**Link analysis and click data are real. Specific weights are not public.** Court findings confirm Navboost and its click window. The 2024 leak names attributes but proves nothing about weights.

## Known and documented

| Signal | Claim | Status |
|---|---|---|
| PageRank | Pages score higher when important pages link to them | Documented in the [PageRank paper](http://ilpubs.stanford.edu:8090/422/); damping 0.85 and link counts not verified |
| Trust propagation | Seed good pages, spread trust along links to demote spam | Documented in [TrustRank](https://www.vldb.org/conf/2004/RS15P3.PDF); Google use not verified |
| Navboost | Memorizes past clicks on query-result pairs | **Court-documented**: [US v. Google findings of fact](https://www.justice.gov/atr/case/us-and-plaintiff-states-v-google-llc), Doc 1033, paras 91 to 98 |
| Click window | 13 months of data now; 18 months before 2017 | Same findings of fact |
| Generalizing models | RankBrain, DeepRank, RankEmbed, RankBERT and Multitask Unified Model (MUM) generalize from text | Same findings; internals not verified |
| Bidirectional Encoder Representations from Transformers (BERT) in Search | Used to understand queries | Documented in [Google's 2019 post](https://blog.google/products/search/search-language-understanding-bert/) |
| Spam | SpamBrain demotes spam | Documented in [Google's spam docs](https://developers.google.com/search/docs/essentials/spam-policies); model internals not public |

The court splits systems into two kinds. **Memorizers** (Navboost, QBST) learn from clicks. **Generalizers** (RankBrain, MUM and others) handle new queries. Company-brain will see both problems.

## Unconfirmed

- **2024 leak.** About 14,000 attributes were reported across API docs. Google confirmed authenticity with a caveat, per [The Verge](https://www.theverge.com/2024/5/29/24167407/google-search-algorithm-documents-leak-confirmation). Names such as goodClicks and badClicks show that click signals are stored. Weights, use and recency are **unconfirmed**.
- **Marketing claims.** Domain authority scores, dwell-time boosts and author rank come from search engine optimization blogs. All **unconfirmed**.
- **Count of signals.** "200 ranking factors" is a folk number. Not verified.

## What this means for pointer search

1. **Text match leads.** On the Benchmarking IR (BEIR) retrieval set, stronger dense models sit 2 to 8% below BM25 zero-shot (recomputed from Table 2). See [alternatives-to-bm25.md](alternatives-to-bm25.md).
2. **Links help when they exist.** In files, links are folder parents, shared mentions and doc-to-doc references. Use them as a small prior, not PageRank over the web.
3. **Clicks need volume.** Navboost works on huge query logs. A team of 50 has too few clicks per query. Agent-open feedback needs aggregation across similar queries.
4. **Spam is not the threat.** Stale and duplicate files are. Recency and canonical-version signals matter more.

## Limits

- Weights and combination logic for any Google signal are not public.
- Documents after 2024 on ranking changes were not reviewed.

## Sources

- [PageRank citation ranking (Page et al.)](http://ilpubs.stanford.edu:8090/422/)
- [Combating web spam with TrustRank](https://www.vldb.org/conf/2004/RS15P3.PDF)
- [US v. Google, findings of fact (DOJ case page)](https://www.justice.gov/atr/case/us-and-plaintiff-states-v-google-llc)
- [BERT in Search, Google blog](https://blog.google/products/search/search-language-understanding-bert/)
- [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [The Verge on the 2024 leak](https://www.theverge.com/2024/5/29/24167407/google-search-algorithm-documents-leak-confirmation)
- [BEIR (Thakur et al.)](https://arxiv.org/abs/2104.08663)
