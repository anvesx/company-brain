# How Google crawls and stores pages, and what transfers

**Only the change-feed idea transfers.** Google's crawler solves open-web discovery and politeness. Company-brain gets change events from connectors. Most of the crawl stack has no use here.

Labels: **documented** means a primary source (Google docs, paper, court record). **Inferred** means reasoned from documented parts. **Unconfirmed** means a blog, SEO site or leak.

## Crawling

| Piece | What it does | Status | Use in company-brain |
|---|---|---|---|
| URL frontier | Queue of URLs to fetch, ordered by priority | Documented in the [Anatomy paper](https://snap.stanford.edu/class/cs224w-readings/Brin98Anatomy.pdf) (1998 design); current design not verified | None. Connectors push changes. |
| Politeness | Googlebot limits fetch rate per host so it does not overload servers | Documented in [Google's crawl docs](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers) | Rate-limit connector API calls instead |
| robots.txt | Site owner tells crawlers which paths to skip | Documented, standard is Request for Comments (RFC) [9309](https://www.rfc-editor.org/rfc/rfc9309) | Replace with source access control lists (ACLs) |
| Recrawl | Revisit pages to catch edits; rate depends on how often a page changes | Inferred from [Caffeine post](https://googleblog.blogspot.com/2010/06/our-new-search-index-caffeine.html); exact policy not verified | Webhook or delta token per connector |
| Duplicate detection | Cluster near-identical pages, pick a canonical | [SimHash, 64-bit fingerprints, 8B pages](https://research.google/pubs/detecting-near-duplicates-for-web-crawling/) (figures not verified); production use inferred | Hash content per file version |
| JS rendering | Render pages with JavaScript (JS) in a headless browser after the first fetch | Documented in [Google's JS docs](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) | None. Files, not web pages. |
| Sitemaps and links | Discover new URLs | Documented in [How Search works](https://developers.google.com/search/docs/fundamentals/how-search-works) | Folder and link edges from the connector |

## Storage and metadata

**Google indexes incrementally.** Caffeine replaced batch rebuilds in 2010 with continuous updates, per [Google's announcement](https://googleblog.blogspot.com/2010/06/our-new-search-index-caffeine.html). It builds on [Percolator](https://research.google/pubs/large-scale-incremental-processing-using-distributed-transactions-and-notifications/), which processes updates with distributed transactions and notifications.

- **Inverted index.** Term to posting list. Documented in the Anatomy paper. Current layout is not verified.
- **Tiers.** Fresh and important pages sit in faster storage. Inferred; Google has not published tier details.
- **Per-document signals.** The [2024 leak](https://www.theverge.com/2024/5/29/24167407/google-search-algorithm-documents-leak-confirmation) listed attributes such as click counts and page quality. Google confirmed the files are authentic and warned they lack context. Treat attribute names as **unconfirmed**; weights and use are unknown.
- **Click store.** Navboost is court-documented. See [ranking.md](ranking.md).

## What company-brain keeps

1. **Incremental update.** One changed file means one changed row. Matches Caffeine's idea at small scale.
2. **Metadata beside text.** Store source, id, title, path, modified time, owner and ACL token per file.
3. **Content hash.** Skip re-indexing when the hash is unchanged.

## Limits

- Anatomy-paper internals (hit lists, barrels, anchor text) are from 1998. Not verified for today.
- Mercator crawler internals: sources failed to load. Not verified.

## Sources

- [The Anatomy of a Large-Scale Hypertextual Web Search Engine](https://snap.stanford.edu/class/cs224w-readings/Brin98Anatomy.pdf)
- [Google: How Search works](https://developers.google.com/search/docs/fundamentals/how-search-works)
- [Google crawlers overview](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)
- [RFC 9309, Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309)
- [Detecting near-duplicates for web crawling (Manku et al.)](https://research.google/pubs/detecting-near-duplicates-for-web-crawling/)
- [Our new search index: Caffeine](https://googleblog.blogspot.com/2010/06/our-new-search-index-caffeine.html)
- [Percolator (Peng and Dabek)](https://research.google/pubs/large-scale-incremental-processing-using-distributed-transactions-and-notifications/)
- [The Verge on the 2024 leak](https://www.theverge.com/2024/5/29/24167407/google-search-algorithm-documents-leak-confirmation)
