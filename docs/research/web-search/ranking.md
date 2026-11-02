# How Google ranks, known versus folklore

**Link analysis and click data are real. Specific weights are not public.** Court findings confirm Navboost and its click window. The 2024 leak names attributes but proves nothing about weights.

## Known and documented

| Signal | Claim | Status |
|---|---|---|
| PageRank | Pages score higher when important pages link to them | Documented in the [PageRank paper](http://ilpubs.stanford.edu:8090/422/) (original URL erroring; [Wayback copy](https://web.archive.org/web/2024/http://ilpubs.stanford.edu:8090/422/)); damping 0.85 and link counts not verified |
| Trust propagation | Seed good pages, spread trust along links to demote spam | Documented in [TrustRank](https://www.vldb.org/conf/2004/RS15P3.PDF); Google use not verified |
| Navboost | Memorizes past clicks on query-result pairs | **Court-documented**: [Memorandum Opinion](https://storage.courtlistener.com/recap/gov.uscourts.dcd.223205/gov.uscourts.dcd.223205.1033.0.pdf) (Doc 1033, 5 Aug 2024), findings of fact para 96 |
| Click window | 13 months of data now; 18 months before 2017 | Same opinion, para 96 |
| Generalizing models | RankBrain, DeepRank, RankEmbed, RankBERT and Multitask Unified Model (MUM) generalize from text | Same opinion, para 97 (QBST in para 95); internals not verified |
| Bidirectional Encoder Representations from Transformers (BERT) in Search | Used to understand queries | Documented in [Google's 2019 post](https://blog.google/products/search/search-language-understanding-bert/) |
| Spam | SpamBrain demotes spam | Documented in [Google's spam updates page](https://developers.google.com/search/updates/spam-updates); model internals not public |

The court splits systems into two kinds. **Memorizers** (Navboost, QBST) learn from clicks. **Generalizers** (RankBrain, MUM and others) handle new queries. Company-brain will see both problems.

## Unconfirmed

- **2024 leak.** [The Verge](https://www.theverge.com/2024/5/29/24167407/google-search-algorithm-documents-leak-confirmation) supports only this: about 2,500 leaked documents; Google confirmed authenticity, with a caveat that they may be out of context, outdated or incomplete. Reports of 14,000 attributes and names such as goodClicks and badClicks come from SEO blogs and are **unconfirmed**. Weights and use are unknown.
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

- [PageRank citation ranking (Page et al.)](http://ilpubs.stanford.edu:8090/422/), [Wayback copy](https://web.archive.org/web/2024/http://ilpubs.stanford.edu:8090/422/)
- [Combating web spam with TrustRank](https://www.vldb.org/conf/2004/RS15P3.PDF)
- [US v. Google, Memorandum Opinion, Doc 1033](https://storage.courtlistener.com/recap/gov.uscourts.dcd.223205/gov.uscourts.dcd.223205.1033.0.pdf)
- [BERT in Search, Google blog](https://blog.google/products/search/search-language-understanding-bert/)
- [Google spam updates](https://developers.google.com/search/updates/spam-updates)
- [The Verge on the 2024 leak](https://www.theverge.com/2024/5/29/24167407/google-search-algorithm-documents-leak-confirmation)
- [BEIR (Thakur et al.)](https://arxiv.org/abs/2104.08663)
