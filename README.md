63%

> Source: this page is the [DevX Brain artifact](https://claude.ai/artifact/WZQCzHZ47E2XPs9UH7j55Z?sk=XEcuQR72uONWUNz3RPY_lA), 20 Nov 2026. The full drill-down is there.

# Devx Brain: one place every agent asks before it starts.

Devx Brain remembers where everything in the company lives and who may see it. It can also keep exact messages, deleted files and laptop folders. This page shows what is built, what is proposed and what is open.

## 1. What is devx-brain

Devx Brain is shared memory for a company's people and their AI agents. An agent asks a question over the Model Context Protocol (MCP). The brain returns the right chunks of the right documents. This is retrieval-augmented generation (RAG): the model answers from fetched text. The brain returns only what that person may see.<sup>[1](#ref1)</sup>

The core is a pointer index. For each document it stores the address, version, content hash, access list and search vectors. The document stays in the app that owns it. The brain fetches it live, so an answer is never older than the source.<sup>[2](#ref2)</sup><sup>[3](#ref3)</sup><sup>[4](#ref4)</sup>

One open-source product, Supermemory's Company Brain, shares our name.<sup>[5](#ref5)</sup>

Two kinds of people connect apps. The admin connects company apps once. Each employee can also connect their own accounts, and choose who may use them.

An index alone is too thin for a company. This page adds four parts the design does not have yet: a vault for exact messages, a vault for files before they are deleted, a pipeline for people who leave, and an agent for laptop folders.

The design follows Nonaka's model of four steps, known as socialization, externalization, combination and internalization (SECI). Socialization shares what people know by talking. Externalization writes it down. Combination joins written pieces. Internalization is when a person learns from them. Today the brain does combination and part of socialization. Externalization is the open gap, and the research says it needs a human in the loop.<sup>[6](#ref6)</sup><sup>[7](#ref7)</sup><sup>[8](#ref8)</sup><sup>[9](#ref9)</sup><sup>[10](#ref10)</sup><sup>[11](#ref11)</sup>

International Business Machines (IBM) shows one way to keep memory live when people leave. It located experts from email and chat metadata, and it automated contribution so staff did no extra work. Its current watsonx offer is cited search over existing documents.<sup>[12](#ref12)</sup><sup>[13](#ref13)</sup><sup>[14](#ref14)</sup><sup>[15](#ref15)</sup><sup>[16](#ref16)</sup>

## 2. Why we are building it

Five things go wrong when each agent searches one app alone.

| Failure today | What happens | What the brain does |
|---|---|---|
| Stale answers | An agent reads a copy that the source has since changed. | Fetches the live document and compares its version to the pointer.<sup>[17](#ref17)</sup> |
| Leaked access | A shared index returns a file the asker cannot open. | Filters by the source's own access list. Rechecks the top results with the user's token.<sup>[18](#ref18)</sup><sup>[19](#ref19)</sup> |
| Repeated work | Someone solves a problem a colleague solved last quarter. | Searches every connected app and shows who solved it and where. |
| Lost knowledge | A person leaves, or a file or message is deleted, and the answer goes with them. | Proposed: keep the exact words, back up before delete, hand work to a successor.<sup>[12](#ref12)</sup><sup>[13](#ref13)</sup><sup>[15](#ref15)</sup> |
| Conflicting documents | Two documents disagree, or a source copies a wrong claim. The model may believe the wrong one. | Proposed: score each source, discount copied claims, and weigh the claim by source trust. This is the source-trust design.<sup>[20](#ref20)</sup><sup>[21](#ref21)</sup><sup>[22](#ref22)</sup><sup>[23](#ref23)</sup><sup>[24](#ref24)</sup><sup>[25](#ref25)</sup><sup>[26](#ref26)</sup><sup>[27](#ref27)</sup><sup>[28](#ref28)</sup><sup>[29](#ref29)</sup><sup>[30](#ref30)</sup> |

Meta's engineers reached the same design in September 2026. They named accuracy evaluation as the open gap.<sup>[2](#ref2)</sup><sup>[31](#ref31)</sup> We treat that gap as ours.<sup>[32](#ref32)</sup><sup>[33](#ref33)</sup>

## 3. What problems it solves

The first twelve rows use your wording, unchanged. Built means working code exists, with the caveats in section 8. Partly means some of the claim works. Proposed means not built.

| Problem | Status | Where it stands |
|---|---|---|
| your agents will be able to get a wider context | partly | The pointer index and the MCP server work. They cover the apps that have a working connector.<sup>[3](#ref3)</sup><sup>[2](#ref2)</sup><sup>[34](#ref34)</sup> |
| your agents would know if a problem is already solved by some other person | partly | Search across connected sources works. A cited answer on every result is not built yet. |
| if the code is already present in some other repo it can directly pick the files and save tokens | partly | The index points at the file. The agent then fetches only the lines it needs, not the whole repo.<sup>[2](#ref2)</sup><sup>[35](#ref35)</sup> |
| if a problem is solved code or other wise even in marketing, sales etc its will not be repeated | partly | This works for each app with a connector. Marketing and sales tools need their own connectors. |
| connection between documents are maintained in graph | built | graph-store holds documents and links, each with a validity window. graph-sync fills it. graph-view shows it. All three are in this repo.<sup>[36](#ref36)</sup><sup>[37](#ref37)</sup><sup>[38](#ref38)</sup> |
| an LLM automatically creates multiple categories for files indexes to lie into. same files could be of multiple categories if in any of the category permission is not granted file should not be granted permission | partly | Zones and the strictest-zone rule are built. LLM-made categories are not. The rule is simple: if any category denies you, the file is denied. |
| it is possible to get access to small part of the document not the whole | partly | The chunker splits documents. Today access is checked per document. Per-chunk access lists are planned. |
| permissions handling will be based on this | built | Two checks gate every result: acl-filter (in anvesx/rag) and visibility decide() (in this repo). Both fail closed.<sup>[39](#ref39)</sup><sup>[40](#ref40)</sup><sup>[18](#ref18)</sup> |
| it will point out a mcp with which agents would connect to get the relevant context and chunks from any other person in the company | built | One remote MCP server at /mcp. It is read-only and signs in as the person who asks. The server code is in anvesx/rag, and brain-mcp is in this repo.<sup>[1](#ref1)</sup> |
| it can also be used to have similar psycological clients help sales team to deal with them or non technical person to get the technical questions before hand that would be a problem later | proposed | Needs call notes and tickets connected, then a prompt that finds similar past clients. No code yet. |
| it will be used to teach devs on similar projects done or interviews taken | proposed | Needs project docs and interview notes connected, plus a learning-path view.<sup>[10](#ref10)</sup><sup>[11](#ref11)</sup> |
| it will be used to get the files from some other project to new project if the same work is already done | proposed | Search exists. A start-a-project flow that copies the matched files does not. |

### Added, because the brain is more than a file index

| Problem | Status | Where it stands |
|---|---|---|
| Exact messages are kept, not summarised | proposed | Slack and chat text is stored word for word, with author, thread, time and edit history. Slack's terms bar a lasting third-party copy, so Slack stays live-query until legal review says otherwise. |
| Index files that will never be deleted | partly | Pointers stay for every file the source keeps. The version and content hash show when a file changed.<sup>[41](#ref41)</sup><sup>[42](#ref42)</sup> |
| Back up files that will be deleted | proposed | A watcher copies a file when a delete webhook or the nightly sweep sees it going. The copy keeps the old access list. |
| People leave the company | proposed | A leaver event moves their work files to a manager and keeps what policy says to keep. It erases personal data and writes a receipt.<sup>[12](#ref12)</sup><sup>[13](#ref13)</sup><sup>[14](#ref14)</sup><sup>[15](#ref15)</sup> |
| Delete everything about a person on request | proposed | Erasure follows the pointer, the vectors, the cache and the backup. A governance module exists, but erasure is on the not-built list. |
| A laptop folder joins the brain | proposed | A small app reads a folder the user picks and sends pointers. The files stay on the laptop unless the user opts in. |

> 

**Decision needed.** Keeping exact messages and backups copies content. That conflicts with architecture decision record (ADR) 0004, which says the brain holds pointers only. It also conflicts with Slack's terms. The choice is per source: store the content, or point to it and query live. Legal should rule on Slack before anyone builds this.

## 4. User flows

### The admin connects a company app

1. Admin signs in with Google
2. Admin picks the app and the least-access scope
3. The connector reads everything in the app
4. Pointers and access lists land in the index
5. Admin sees counts and what was skipped

### An employee connects their own account

1. Employee signs in and picks an account, such as Drive, GitHub, Slack or Gmail
2. Employee gives consent for that account only
3. Employee sets who may use it: only them, them and their agents, or the company
4. Employee sets who may read what it syncs
5. Private data is written owner-only. Company data follows the app's own access lists

### An employee asks an agent

1. The agent calls the brain over MCP as the employee
2. The index narrows by access list
3. The live app confirms the top results
4. The agent receives chunks with citations
5. The audit log records who asked what

### A document changes

1. A webhook arrives, or the cursor finds the change
2. The brain compares version and hash
3. Pointer and vectors update
4. Dependents are marked stale
5. Subscribers get an event

### A person leaves

1. The identity provider sends a leaver event
2. The person's access is cut at once
3. Their files go to the manager
4. Policy keeps work files and erases personal data
5. A receipt goes to the audit log

### A new project starts

1. The lead describes the project
2. The brain finds earlier projects that match
3. The lead picks files to reuse
4. Files are fetched live under the lead's access
5. The old-to-new link is stored in the graph

## 5. The solution in simple steps

1. The admin connects each company app once. Employees connect their own accounts too. Each connector reads with the least access that works.
2. Each change arrives by webhook, delta cursor or nightly sweep, whichever the app offers.<sup>[41](#ref41)</sup><sup>[42](#ref42)</sup>
3. For each document the brain stores a pointer, a content hash, an access list and search vectors.
4. Proposed: an LLM sorts each document into several categories. The strictest category sets the permission.
5. A person or agent asks a question through MCP, signed in as themselves.
6. The index narrows the candidates with the access list. The live app then confirms the top results.<sup>[39](#ref39)</sup>
7. The agent gets ranked chunks with citations. The document stays at the source.
8. Proposed: nightly jobs check for drift and fade out old facts.<sup>[43](#ref43)</sup>
9. Messages, backups and laptop folders feed the same index through the same permission gate.
10. When a file is deleted or a person leaves, the brain keeps, hands over or erases by policy.

## 6. The design on one page

Each box is one stage of the design in `docs/brain/model.json`. Solid black boxes are in that design. Dashed blue boxes are the four proposed parts, and they are not built. The numbers match the list under the diagram. 

The diagram is on the [artifact page](https://claude.ai/artifact/WZQCzHZ47E2XPs9UH7j55Z?sk=XEcuQR72uONWUNz3RPY_lA). Its numbered boxes:

1. Change events and delta cursors
2. AI chat and activity records from laptops
3. Folder scan results from the device
4. Pointers: uri, version, content hash, acl version
5. Message text and edits where terms allow
6. Items about to be deleted at the source
7. Zone label on every derived record
8. Strictest zone and group membership
9. Delete and expire instructions
10. Leaver events from the identity provider
11. Retention clocks and restore requests
12. Filtered candidate set, rechecked live
13. Ranked chunks with citations
14. MCP tool calls under the user token
15. Context for proposed updates
16. Latency, misses and cost counters
17. Device token handed to the agent only
18. Health and job state


_Each box lists the first six components of its stage. The full design has 152 components and 461 edges._

## 7. The full drill-down

Every stage, group and component has its own page with a spec card. Open it from the artifact page: [Open the drill-down](https://claude.ai/artifact/WZQCzHZ47E2XPs9UH7j55Z?sk=XEcuQR72uONWUNz3RPY_lA)

_The drill-down has 14 stages, 28 groups, 152 components and 461 edges._

## 8. What is done, by feature

Two measures exist, and they count different things. The first is 63%, which is 26 of 41 committed units (6 Nov). The second is 5.7%, which is 75 of 1,306 rebuild items (13 Nov). The second is stricter.

Package counts in docs/progress.md date from 6 Nov. Architecture decision records 0005 and 0006 later moved retrieval and ranking to anvesx/rag. None of the 6 planned capabilities is counted. Nothing has run against real GitHub or Drive accounts.

| Feature | Packages and the repo that holds them | Status |
|---|---|---|
| Connect to apps | company-brain: connector-kit, connector-vault, google-identity, token-refresh, connections app. anvesx/connectors: @anvesx/connectors 0.1.0. anvesx/rag: connector-runtime. | Code exists for admin and employee connections. connector-runtime's mutation test run is not green, so it is not among the 26 counted units. Rebuild checklist: connector-vault 0 of 36. The connections app is marked to delete. |
| Catch changes | company-brain: change-cursor, job-queue. | Code exists. Rebuild checklist: job-queue 0 of 37. |
| Pointer index | company-brain: graph-store, graph-sync, migrations. anvesx/rag: pointer-registry, index-service, chunker. | Code exists. Rebuild checklist: migrations 0 of 36. The brain app in rag keeps its registry in memory (board issue 50). |
| Permissions and zones | company-brain: visibility, zone-policy, source-trust. anvesx/rag: acl-filter, audit-chain, audit-service. | Code exists. Rebuild checklist: visibility gate 0 of 53, audit log 0 of 27. |
| Search and answer | company-brain: query-router. anvesx/rag: hybrid-search, query-service, retrieval, embedder. rank: only on the unmerged rank-move branch of rag. | hybrid-search scores 73.81 on mutation testing. The break line is 80. Rebuild checklist: search 0 of 34. Citations on every answer are not built. |
| Agent interface | company-brain: brain-mcp. anvesx/rag: mcp-search-tool, mcp-service. | Code exists. mcp-service's mutation test run is not green. |
| Views | company-brain: files-view, graph-view, design-system, brain app. | Code exists. files-view was merged after it failed independent verification twice. Rebuild checklist: files view UI 0 of 32. |
| Not built | validity and supersession, memory distillation, erasure and tenant keys, evaluation harness, capture daemon, action agent, review queue, consolidation | None of the six listed capabilities is counted. |
| Not in this build at all | exact message vault, archive and backup vault, leaver pipeline, laptop folder agent | Proposed on this page. Needs a decision on Slack's terms first. |

## 9. Research citations

The small numbers in the text point to this list. A package with no source here is our own proposal. The first group holds the sources that are literally about a company brain. The other groups are papers and posts behind specific design choices.

### Company brain sources

| Source | Date | What we took from it |
|---|---|---|
| <a id="ref1"></a>**1.** [How to build a company brain](https://vectorize.io/articles/how-to-build-company-brain)<br>Vectorize | 2026 | Enforce each user's permission at retrieval. Write outcomes back. |
| <a id="ref2"></a>**2.** [An Organizational Second Brain](https://engineering.fb.com/2026/09/02/ml-applications/organizational-second-brain-ai-learns-from-experts/)<br>Sengar et al., Meta Engineering | 2 Sep 2026 | A file graph with routing indexes. About 80% fewer tokens per turn. Names accuracy evaluation as the gap. |
| <a id="ref3"></a>**3.** [Company brain solutions](https://slite.com/learn/company-brain-solutions)<br>Slite | 10 Sep 2026 | Defines a brain as signals in, a store, upkeep and a way to ask. |
| <a id="ref4"></a>**4.** [LLM wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)<br>Andrej Karpathy | 4 Apr 2026 | The wiki pattern that Meta and Slite both cite. |
| <a id="ref5"></a>**5.** [Supermemory Company Brain](https://github.com/supermemoryai/company-brain)<br>Supermemory | 2026 | Closest product with the same name. A Slack agent with a live graph. Open source, Apache 2.0. |
| <a id="ref31"></a>**31.** [Meta organizational agents](https://infoq.com/news/2026/09/meta-organizational-agents)<br>InfoQ | Sep 2026 | Secondary report on the Meta post. |
| <a id="ref34"></a>**34.** [How Meta used AI to map tribal knowledge](https://engineering.fb.com/2026/04/06/developer-tools/how-meta-used-ai-to-map-tribal-knowledge-in-large-scale-data-pipelines/)<br>Meta Engineering | 6 Apr 2026 | Agents wrote context files for data pipelines. Code scope only. |
| <a id="ref43"></a>**43.** [gbrain project page](https://github.com/garrytan/gbrain)<br>Garry Tan | 2026 | Dream cycle, time decay and drift checks. Source for the upkeep jobs. |

### SECI and knowledge transfer

| Source | Date | What we took from it |
|---|---|---|
| <a id="ref6"></a>**6.** [A Dynamic Theory of Organizational Knowledge Creation](https://www.uky.edu/~gmswan3/EDC608/Nonaka_1994.pdf)<br>Ikujiro Nonaka | 1994 | Where the model of four steps comes from: socialization, externalization, combination and internalization. Externalization is the slow, dialogue-heavy step. We read only the first pages. |
| <a id="ref7"></a>**7.** [The Knowledge-Creating Company (book review)](https://www.strategy-business.com/article/8592)<br>Nonaka and Takeuchi, reviewed in strategy+business | 1996 | The book that made the model well known. We read a review, not the book. |
| <a id="ref8"></a>**8.** [GenAI SECI Model](https://arxiv.org/abs/2603.21866)<br>Uchihira | 2026 | Adds the idea of fragmented digital knowledge to the model. Concept only, no evidence. We read the abstract. |
| <a id="ref9"></a>**9.** [LLMs for Tacit Knowledge Discovery](https://arxiv.org/html/2507.03811v1)<br>Zuin et al. | 2025 | An agent that interviewed simulated staff recovered the full answer in 820 of 864 runs (94.9%). Simulation only. |
| <a id="ref10"></a>**10.** [Knowledge Activation](https://arxiv.org/pdf/2603.14805)<br>Bakal, Yahoo | 2026 | Maps each step of the model to a graph of agent-readable knowledge units. Keeps a human in the externalization step. Reports 2.6 hours a week saved, self-reported. |
| <a id="ref11"></a>**11.** [The Human-Machine Knowledge Spiral](https://arxiv.org/pdf/2606.29227)<br>Chatterji, Rock and Talamas | 2026 | AI adds machine knowledge. The firm's job stays the same: provide shared context. An essay with one case. |

### IBM and people who leave

| Source | Date | What we took from it |
|---|---|---|
| <a id="ref12"></a>**12.** [SmallBlue: finding experts from email and chat](https://sites.cs.ucsb.edu/~xyan/papers/icde09_smallblue.pdf)<br>Lin et al., IBM Research | 2009 | IBM found experts from email and chat metadata. It was opt-in with privacy limits. About eight million emails and chat transcripts, nearly 350,000 recipients. |
| <a id="ref13"></a>**13.** [IBM Global Business Services: expertise location](https://public.dhe.ibm.com/services/us/gbs/bus/hcm/rbtt/expertiselocation.pdf)<br>American Productivity and Quality Center (APQC) case study | 2010 | IBM moved from a document store to finding people, because tacit knowledge cannot all be written down. It automated contribution so staff did no extra work. |
| <a id="ref14"></a>**14.** [Unlock the People Equation](https://ibm.com/downloads/cas/7JEENPAQ)<br>IBM Institute for Business Value | Dec 2014 | Treats knowledge loss as a risk to predict from workforce data. A weak source: it lists the risk and gives no figure. |
| <a id="ref15"></a>**15.** [How to avoid knowledge decay in software engineering](https://leaddev.com/ai/how-to-avoid-knowledge-decay-in-software-engineering)<br>Doerrfeld, LeadDev, interviewing IBM's Neel Sundaresan | 29 Jul 2026 | Keep the reasoning and context next to the artifact. A trade-press interview, not IBM research. |
| <a id="ref16"></a>**16.** [watsonx Orchestrate knowledge base](https://community.ibm.com/community/user/blogs/fatemeh-ghasemi/2026/07/17/wxo-rag-part1)<br>Ghasemi, IBM Community blog | 17 Jul 2026 | IBM's current offer is cited search over existing documents. It does not interview a departing expert. |

### Truth and source trust

| Source | Date | What we took from it |
|---|---|---|
| <a id="ref20"></a>**20.** [TruthFinder](https://hanj.cs.illinois.edu/pdf/tkde08_xyin.pdf)<br>Yin, Han and Yu | 2008 | Score the source and the fact together. Majority voting fails when sources copy each other. |
| <a id="ref21"></a>**21.** [Integrating conflicting data: the role of source dependence](http://lunadong.com/publication/dependence_vldb.pdf)<br>Dong, Berti-Equille and Srivastava | 2009 | Shared false values are strong evidence of copying. Discount copied votes. |
| <a id="ref22"></a>**22.** [A Bayesian approach to discovering truth (LTM)](https://arxiv.org/abs/1203.0058)<br>Zhao et al. | 2012 | Two-sided source quality. 0.995 accuracy on books against 0.880 for voting. |
| <a id="ref23"></a>**23.** [Knowledge-Based Trust](https://arxiv.org/abs/1502.03519)<br>Dong et al., Google | 2015 | Separates extractor error from source error. Scored 119M pages. |
| <a id="ref24"></a>**24.** [Data Fusion: resolving conflicts from multiple sources](https://arxiv.org/abs/1503.00310)<br>Dong, Berti-Equille and Srivastava | 2015 | Source accuracy to vote weight maths used in our source-trust rules. |
| <a id="ref25"></a>**25.** [A Survey on Truth Discovery](https://arxiv.org/abs/1505.02463)<br>Li et al. | 2016 | A taxonomy of methods. Start from uniform weights and iterate. |

### Retrieval and conflicting text

| Source | Date | What we took from it |
|---|---|---|
| <a id="ref17"></a>**17.** [FRESCO](https://arxiv.org/abs/2604.14227)<br>An et al., Meta Superintelligence Labs and University of California, Los Angeles | 2026 | Rerankers prefer older, richer text over newer facts when they conflict. |
| <a id="ref26"></a>**26.** [ClashEval](https://arxiv.org/abs/2404.10198)<br>Wu et al. | 2024 | Measures how often a model copies a wrong retrieved document. |
| <a id="ref27"></a>**27.** [Astute RAG: resolving imperfect retrieval](https://arxiv.org/abs/2410.07176)<br>Wang et al. | 2024 | About 70% of retrieved passages in real web search lack the true answer. Groups consistent claims across sources. |
| <a id="ref28"></a>**28.** [Not All Contexts Are Equal: credibility-aware generation](https://arxiv.org/abs/2404.06809)<br>Pan et al. | 2024 | Tag each document with a credibility label and train the model to weigh it. |
| <a id="ref29"></a>**29.** [On the risk of misinformation pollution with LLMs](https://arxiv.org/abs/2305.13661)<br>Pan et al. | 2023 | One fake document per question, at most 0.1% of the corpus, cuts accuracy by up to 87%. |
| <a id="ref30"></a>**30.** [Knowledge Conflicts for LLMs: a survey](https://arxiv.org/abs/2403.08319)<br>Xu et al. | 2024 | Maps conflicts between memory and retrieved text. |

### Permissions, privacy and scale

| Source | Date | What we took from it |
|---|---|---|
| <a id="ref18"></a>**18.** [The Good and the Bad: privacy issues in retrieval-augmented generation](https://arxiv.org/abs/2402.16893)<br>Zeng et al., Michigan State and others | 2024 | Crafted prompts make the model print retrieved records. Verbatim leaks near 50% on two models. This is why the permission gate comes before the model. |
| <a id="ref19"></a>**19.** [I Know What You Asked: prompt leakage through shared caches](https://ndss-symposium.org/wp-content/uploads/2025-1772-paper.pdf)<br>Wu et al., SUSTech and ByteDance | 2025 | Sharing a cache across tenants lets one tenant rebuild another's prompt. We do not share caches across tenants. |
| <a id="ref32"></a>**32.** [CRAG: a benchmark of questions for retrieval-augmented generation](https://arxiv.org/abs/2406.04744)<br>Yang et al., Meta | 2024 | A question set with time-sensitive questions. We have no equal yet. |
| <a id="ref39"></a>**39.** [Filtered-DiskANN](https://harsha-simhadri.org/pubs/Filtered-DiskANN23.pdf)<br>Gollapudi et al., Microsoft Research | 2023 | A label-aware graph index. Works when a filter keeps 1 in 10,000 to 1 in 1,000,000 documents. |
| <a id="ref40"></a>**40.** [ACORN](https://arxiv.org/abs/2403.04871)<br>Patel, Kraft et al., Stanford | 2024 | Search walks only nodes that pass the filter. |
| <a id="ref41"></a>**41.** [Large-scale incremental processing (Percolator)](https://www.usenix.org/legacy/event/osdi10/tech/full_papers/Peng.pdf)<br>Peng and Dabek, Google | 2010 | Index work scales with the change, not with the corpus. |
| <a id="ref42"></a>**42.** [DBLog: change-data capture with watermarks](https://arxiv.org/abs/2010.12597)<br>Andreakis and Papapanagiotou, Netflix | 2020 | Mixes log events with chunked table reads. Can pause and resume. |

### Agent memory and graphs

| Source | Date | What we took from it |
|---|---|---|
| <a id="ref33"></a>**33.** [LongMemEval](https://arxiv.org/abs/2410.10813)<br>Wu et al., University of California, Los Angeles and others | 2025 | 500 questions on memory, including knowledge updates. Long-context models drop 30% to 60%. |
| <a id="ref35"></a>**35.** [MemGPT](https://arxiv.org/abs/2310.08560)<br>Packer et al. | 2023 | Working memory plus an archive. Close to our pointer index with live fetch. |
| <a id="ref36"></a>**36.** [Zep: a temporal knowledge graph for agent memory](https://arxiv.org/abs/2501.13956)<br>Rasmussen et al., Zep AI | 2025 | Four timestamps per edge. A contradiction closes the old edge, so it can answer what was believed on a date. |
| <a id="ref37"></a>**37.** [Mem0: scalable long-term memory](https://arxiv.org/abs/2504.19413)<br>Chhikara et al. | 2025 | An LLM picks add, update, delete or no-op for each new fact. |
| <a id="ref38"></a>**38.** [From Local to Global: GraphRAG](https://arxiv.org/abs/2404.16130)<br>Edge et al. | 2024 | Community summaries answer theme questions. It rebuilds the whole graph. |

_Still to fetch: Colrows, Falconer, Foundation Capital on context graphs. The audit of exact sources is in `docs/brain/research/exact/README.md`._

## Repository

This repo holds the graph-only brain app, the connections app and the shared contracts. Retrieval (RAG) is in [anvesx/rag](https://github.com/anvesx/rag) and connectors are in [anvesx/connectors](https://github.com/anvesx/connectors) (ADR 0005).

| Tier | Packages | Depends on |
|---|---|---|
| features | change-cursor, connector-kit, core-types, graph-store, query-router, zone-policy | nothing |
| services | graph-sync | features |
| apps | brain, connections | services, features |

Design: [docs/brain](docs/brain). Decisions: [docs/adr](docs/adr). Specs: [docs/specs](docs/specs). The percentage on line 1 is computed in [docs/progress.md](docs/progress.md).

```bash
pnpm install
pnpm turbo run typecheck
pnpm turbo run test --concurrency=2
pnpm structure
pnpm guard:fakes
```

The two apps install `@anvesx/connectors` 0.1.0 from GitHub Packages. Set `NODE_AUTH_TOKEN` to a token with `read:packages` before running `pnpm install`.
