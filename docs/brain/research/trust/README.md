# Source trust research

Which source to believe when two documents disagree, and how much weight a source gets before anyone checks it. This folder is topic research, not "exact company brain" research; the exact-only rule in `../exact/README.md` does not apply here. Fetched 5 Nov 2026. Cards sit in four group folders; each has a `pdf/` folder holding the papers the publisher allowed us to download.

## Cards

| Card | Source | Status |
| --- | --- | --- |
| Truth discovery (conflicting values, source weights) | | |
| [truthfinder-yin-2008.md](truth-discovery/truthfinder-yin-2008.md) | Yin, Han, Yu, IEEE TKDE 2008 | fetched in full |
| [knowing-what-to-believe-pasternack-2010.md](truth-discovery/knowing-what-to-believe-pasternack-2010.md) | Pasternack, Roth, COLING 2010 | fetched in full |
| [latent-truth-model-zhao-2012.md](truth-discovery/latent-truth-model-zhao-2012.md) | Zhao et al., PVLDB 2012 | fetched in full |
| [crh-li-2014.md](truth-discovery/crh-li-2014.md) | Li et al., SIGMOD 2014 | abstract only (paywalled) |
| [source-dependence-dong-2009.md](truth-discovery/source-dependence-dong-2009.md) | Dong, Berti-Equille, Srivastava, VLDB 2009 | fetched in full |
| [data-fusion-dong-2015.md](truth-discovery/data-fusion-dong-2015.md) | Dong, Berti-Equille, Srivastava, arXiv 1503.00310 | fetched in full |
| [knowledge-based-trust-dong-2015.md](truth-discovery/knowledge-based-trust-dong-2015.md) | Dong et al. (Google), PVLDB 2015 | fetched in full |
| [truth-discovery-survey-li-2016.md](truth-discovery/truth-discovery-survey-li-2016.md) | Li et al., SIGKDD Explorations 2016 | fetched in full |
| [truth-discovery-evaluation-waguih-2014.md](truth-discovery/truth-discovery-evaluation-waguih-2014.md) | Waguih, Berti-Equille, arXiv 1409.6428 | fetched in full |
| News credibility and bias (how raters judge outlets) | | |
| [crowdsourced-source-quality-pennycook-2019.md](news-studies/crowdsourced-source-quality-pennycook-2019.md) | Pennycook, Rand, PNAS 2019 | fetched in full |
| [predicting-factuality-baly-2018.md](news-studies/predicting-factuality-baly-2018.md) | Baly et al., EMNLP 2018 | fetched in full |
| [fair-and-balanced-budak-2016.md](news-studies/fair-and-balanced-budak-2016.md) | Budak, Goel, Rao, POQ 2016 | fetched in full |
| [media-slant-gentzkow-2010.md](news-studies/media-slant-gentzkow-2010.md) | Gentzkow, Shapiro, Econometrica 2010 | fetched in full |
| [lateral-reading-wineburg-2019.md](news-studies/lateral-reading-wineburg-2019.md) | Wineburg, McGrew, Teachers College Record 2019 | fetched in full (2018 in-press copy) |
| [spread-of-false-news-vosoughi-2018.md](news-studies/spread-of-false-news-vosoughi-2018.md) | Vosoughi, Roy, Aral, Science 2018 | fetched in full |
| [ad-fontes-methodology.md](rater-methods/ad-fontes-methodology.md) | Ad Fontes Media | methodology page |
| [newsguard-criteria.md](rater-methods/newsguard-criteria.md) | NewsGuard | methodology page |
| [allsides-methodology.md](rater-methods/allsides-methodology.md) | AllSides | methodology page |
| [wikipedia-reliable-sources.md](rater-methods/wikipedia-reliable-sources.md) | Wikipedia WP:RS and perennial sources | methodology page |
| Retrieval with untrusted or conflicting passages | | |
| [knowledge-conflicts-survey-xu-2024.md](retrieval/knowledge-conflicts-survey-xu-2024.md) | Xu et al., arXiv 2403.08319 | fetched in full |
| [convincing-evidence-wan-2024.md](retrieval/convincing-evidence-wan-2024.md) | Wan, Wallace, Klein, arXiv 2402.11782 | fetched in full |
| [clasheval-wu-2024.md](retrieval/clasheval-wu-2024.md) | Wu et al., arXiv 2404.10198 | fetched in full |
| [astute-rag-wang-2024.md](retrieval/astute-rag-wang-2024.md) | Wang et al., arXiv 2410.07176 | fetched in full |
| [credibility-aware-generation-pan-2024.md](retrieval/credibility-aware-generation-pan-2024.md) | Pan et al., arXiv 2404.06809 | fetched in full |
| [cram-deng-2024.md](retrieval/cram-deng-2024.md) | Deng et al., arXiv 2406.11497 | fetched in full |
| [misinformation-pollution-pan-2023.md](retrieval/misinformation-pollution-pan-2023.md) | Pan et al., arXiv 2305.13661 | fetched in full |
| [ra-rag-hwang-2024.md](retrieval/ra-rag-hwang-2024.md) | Hwang et al., arXiv 2410.22954 | fetched in full |

## What the sources agree on

1. Trust is scored per claim, then rolled up to the source. A source is as good as the share of its claims that held up (Dong 2015 KBT; TruthFinder; the survey's one principle, Eq 1 and 2).
2. Majority vote only works when sources are independent and equally good. Copies inflate votes; shared false values reveal copying (Dong 2009, Table 6: precision 0.71 vote, 0.87 with accuracy plus copy detection).
3. No single truth-discovery method wins everywhere; the winner changes per dataset, and all methods do poorly when most claims are false (Waguih 2014, Table 5 and Fig 4b).
4. Bias and reliability are two axes. AllSides rates bias only; NewsGuard and Ad Fontes rate reliability; Budak 2016 found outlet slant small and opinion pieces far more slanted than news (Fox opinion 0.28 against news 0.03, Fig 1b).
5. Judge a source from outside it. Fact-checkers leave the page and read what others say (lateral reading, Wineburg 2019); a politically balanced lay crowd matched fact-checkers at r = 0.90 (Pennycook 2019, Fig 3).
6. Language models do not weigh credibility on their own. Relevance beats every style and authority cue (Wan 2024, Fig 2); models adopt a wrong passage 31 to 63 percent of the time (ClashEval, Table 2). Labelling or down-weighting a low-trust passage beats dropping it (CAG, Fig 4; CrAM, Table 2).

## The algorithm we take from this

Each step names the card it comes from. The composition is our proposal.

1. Prior per source class, set by people, not learned. Signed or approved records (contracts, ledger, policy) above systems of record (CRM, HR), above wikis, above tickets, above chat, above drafts. Opinion and news get separate priors (Budak 2016; Wikipedia WP:RS four factors: piece, creator, publication, publisher).
2. Dedupe before counting. Near-identical text from two places is one vote with a copy edge, not two (Dong 2009, Eq 9).
3. Resolve each conflicting property value with weighted voting, then update each source's accuracy from how many of its values won, and repeat until stable (survey Eq 1 and 2; ACCU score A'(S) = log(nA / (1 minus A)), data-fusion-dong-2015 Sec 2.3, Eq 3 and 4). Sources with fewer than five claims keep their class prior (KBT Sec 5.3.1: 74 percent of URLs give fewer than five triples).
4. Newest valid row wins a tie between sources of equal accuracy (Zep two clocks, in the build guide). Age decays the vote, it never flips it.
5. At answer time, keep every passage and label it with its trust score; never silently drop one (CAG, Fig 4). Group passages by the claim they support and answer from the most reliable group; when two groups tie, show both with citations (Astute RAG, Sec 4.3 and 4.4).
6. Learn accuracy from outcomes. Every correction a person makes is a resolved truth that re-scores the sources that got it wrong (RA-RAG Sec 6.2 and Fig 5, PCC 0.991 for one of three users, 0.998 and 0.999 for the others).

## Not covered

CRH is abstract only; its weight update is cited from the survey. Ad Fontes scale ranges came from a rating page, not the methodology page. No card here is a company-brain source; nothing in `../exact` prescribes a trust model.
