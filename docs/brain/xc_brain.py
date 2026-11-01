"""Cross-cutting pages for the Devx Brain drill-down, derived from research/*.json|md and the model.

No page keeps its own copy of a fact: tables are parsed from the research files at build time, so a correction
in research/ reaches the page on the next build.
"""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
RES = HERE / "research"


def md_table(path: Path, heading: str):
    text = path.read_text(encoding="utf-8")
    m = re.search(r"^## " + re.escape(heading) + r".*$", text, re.M)
    if not m:
        raise SystemExit(f"xc_brain: heading not found: {heading} in {path.name}")
    rows, started = [], False
    for line in text[m.end():].splitlines():
        if line.startswith("## ") and started:
            break
        if line.startswith("|"):
            started = True
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if set("".join(cells)) <= set("-: "):
                continue
            rows.append(cells)
    return rows[0], rows[1:]


def md_list(path: Path, heading: str):
    text = path.read_text(encoding="utf-8")
    m = re.search(r"^## " + re.escape(heading) + r".*$", text, re.M)
    out = []
    for line in text[m.end():].splitlines():
        if line.startswith("## "):
            break
        if re.match(r"^\d+\. |^- ", line):
            out.append(re.sub(r"^\d+\. |^- ", "", line).replace("**", ""))
    return out


def cell(text: str):
    """A markdown cell with [t](url) links becomes {links:[...]} plus the plain text."""
    links = [{"t": t, "href": u} for t, u in re.findall(r"\[([^\]]+)\]\((https?://[^)]+)\)", text)]
    plain = re.sub(r"\s*\[[^\]]+\]\(https?://[^)]+\)", "", text).strip()
    if not links:
        return plain
    return {"links": ([{"t": plain, "href": "#"}] if False else []) + links, "_text": plain}


def flat_cell(text: str):
    """Plain text first, then its links on separate lines (the viewer renders {links:[...]} only)."""
    links = [{"t": t, "href": u} for t, u in re.findall(r"\[([^\]]+)\]\((https?://[^)]+)\)", text)]
    plain = re.sub(r"\s*\[[^\]]+\]\(https?://[^)]+\)", "", text).strip()
    if not links:
        return plain
    return {"links": [{"t": plain, "href": "none"}] + links}


GLOSSARY = [
    ["ACL", "Access control list: who may read a document."],
    ["ANN", "Approximate nearest neighbour: fast vector search that may miss a few matches."],
    ["CDC", "Change data capture: reading a database's change log."],
    ["DEK", "Data encryption key: the key that locks one tenant's data."],
    ["DLQ", "Dead letter queue: where events that keep failing wait for a person."],
    ["ELT / ETL", "Extract, load, transform and extract, transform, load: ways to move data between systems."],
    ["HMAC", "Hash-based message authentication code: proves a webhook came from the sender."],
    ["IDOR", "Insecure direct object reference: guessing an id to reach someone else's record."],
    ["KMS", "Key management service: a vault that holds encryption keys."],
    ["MCP", "Model Context Protocol: the open standard that lets a model call tools and read data."],
    ["MRR", "Mean reciprocal rank: a score for how high the right answer appears."],
    ["NFC", "Unicode normalisation form C: one canonical spelling for the same text."],
    ["RAG", "Retrieval-augmented generation: fetch passages first, then let the model answer from them."],
    ["REST", "A common style of web API over HTTP."],
    ["RFC", "Request for Comments: a numbered internet standard."],
    ["RTS", "Real-time search: Slack's live search API."],
    ["SCIM", "System for Cross-domain Identity Management: a standard feed of users and groups."],
    ["SHA", "Secure Hash Algorithm: makes a short fingerprint of content."],
    ["SLA", "Service level agreement: a promised response time or uptime."],
    ["SPANN", "A vector index that keeps cluster centres in memory and vectors on disk."],
    ["SSRF", "Server-side request forgery: tricking a server into calling an address it should not."],
    ["TTL", "Time to live: how long a stored item stays valid."],
    ["URI", "Uniform resource identifier: the address of a document."],
    ["MDM", "Mobile device management: how a company pushes software and settings to laptops."],
    ["OAuth", "The standard way an app gets limited access to your account without your password."],
    ["OTel", "OpenTelemetry: an open standard for traces and metrics."],
    ["SSO", "Single sign-on: one company login for many apps."],
    ["JSONL", "A text file with one JSON record per line; Claude Code and Codex store sessions this way."],
    ["SOC 2 / ISO 27001", "Audit reports and a standard that show a company handles data safely."],
    ["HIPAA / GDPR", "US health-data law and EU privacy law."],
    ["DLP", "Data loss prevention: rules that block sensitive content from leaving."],
    ["RBAC", "Role-based access control: permissions given by job role."],
    ["BYOK / BYOC", "Bring your own key / bring your own cloud: the customer holds the key or runs the software in their cloud."],
    ["ZDR", "Zero data retention: a vendor setting where prompts are not stored."],
    ["OWASP", "Open Worldwide Application Security Project: publishes common security risk lists."],
    ["AWS / GCP", "Amazon and Google cloud platforms."],
    ["MIT / AGPL", "Open-source licences. MIT is permissive. AGPL requires sharing code of networked changes."],
]


def short(text: str, limit: int = 28) -> str:
    """First clause of a research claim, at most `limit` words, so a table cell stays one readable sentence."""
    first = re.split(r"[;.] ", text)[0]
    words = first.split()
    return " ".join(words[:limit]) + ("..." if len(words) > limit else "")


def pages(model, sk, refs):
    papers = json.loads((RES / "papers.json").read_text(encoding="utf-8"))
    repos = json.loads((RES / "repos.json").read_text(encoding="utf-8"))
    prods = json.loads((RES / "products.json").read_text(encoding="utf-8"))
    out = []

    # ---- build order (from layers)
    st = json.loads((HERE / "stack.json").read_text(encoding="utf-8"))
    gtitle = {g["id"]: (s["title"], g["title"]) for s in sk["stages"] for g in s["groups"]}
    sections = []
    for L in st["layers"]:
        placed = "; ".join(f"{gtitle[g][0]}: {gtitle[g][1]}" for g in L["groups"].split())
        sections.append({"h": f"Build {L['n'] + 1} of {len(st['layers'])}. {L['id']}: {L['title']}", "kind": "table", "cols": ["Item", "Detail"],
                         "rows": [["What is built", L["built"]], ["Why it comes here", L["why_first"]], ["Exit test", L["exit_test"]],
                                  ["Stubbed until a later layer", L["stubs"]], ["Cost ceiling", L["ceiling"]], ["Groups in this layer", placed]]})
    out.append({"id": "stack", "title": f"Build order: {len(st['layers'])} layers", "blurb": "What to build first and the test that lets the next layer start.",
                "intro": "Each layer ends with an exit test. Do not start the next layer until it passes. Nobody but the admin may query the brain until layer L3 passes: search comes before permissions on purpose, so it is built behind a single-user switch.",
                "sections": sections})

    # ---- why this design (13 decisions from techniques.md)
    dec = md_list(RES / "techniques.md", "Recommended reference architecture")
    out.append({"id": "design", "title": "The 13 design decisions", "blurb": "The design in plain words, each with its reason and its risk.",
                "intro": "The brain keeps pointers, metadata, access lists and vectors. It does not keep the content. Our reading of the research: no vendor documents exactly this design, so it is our inference. Every decision below cites the research pass; open the References page for the links.",
                "sections": [{"h": "Decisions, in the order they are applied", "kind": "list", "rows": dec}]})

    # ---- products compared
    prow = [[p["name"], p["style"], p["permissions"], p["freshness"], {"links": [{"t": "Source", "href": p["url"]}]}] for p in prods]
    concl = md_list(RES / "products.md", "Verdict")
    out.append({"id": "products", "title": "Products compared", "blurb": f"{len(prods)} products and what they teach about index versus live fetch.",
                "intro": "Every large vendor ships both an index and a live path. Connector counts and prices are marketing until a contract says otherwise.",
                "sections": [{"h": "Eleven conclusions", "kind": "list", "rows": concl},
                             {"h": "One row per product", "kind": "table", "cols": ["Product", "Style", "Permissions", "Freshness", "Source"], "rows": prow}]})

    # ---- per-app facts
    hdr, rows = md_table(RES / "products.md", "Per-app integration facts")
    out.append({"id": "apps", "title": "App by app: change feeds, limits, terms", "blurb": "What each app gives us to stay fresh, and what its terms let us keep.",
                "intro": "'not found' means the research pass did not find the item in the vendor's public documentation. It does not mean the app has none. Slack's terms decide that Slack is queried live and never indexed.",
                "sections": [{"h": f"{len(rows)} apps", "kind": "table", "cols": hdr, "rows": [[flat_cell(c) for c in r] for r in rows]}]})

    # ---- scale ladder
    hdr, rows = md_table(RES / "techniques.md", "Scaling ladder")
    out.append({"id": "ladder", "title": "Scaling ladder", "blurb": "What to build at team size, 10,000 employees and 1,000,000.",
                "intro": "Sizes marked estimate are our arithmetic from published list prices, not a vendor quote.",
                "sections": [{"h": "Three rungs", "kind": "table", "cols": hdr, "rows": rows}]})

    # ---- papers
    out.append({"id": "papers", "title": "Papers and what they settle", "blurb": f"{len(papers)} papers and the one thing each means for the brain.",
                "intro": "No paper tests a pointer index with live fetch against a full-copy index. That comparison is our own test to run (see What is not covered). Papers from the 2025 to 2026 search are summarised on the page What the latest papers change. Findings on the core at scale (graph, quantised vectors, object-storage index, permission patching) are on the page A better core: what is backed.",
                "sections": [{"h": "By theme", "kind": "table", "cols": ["Theme", "Paper", "What it shows", "What we take", "Link"],
                              "rows": [[p["theme"], f"{p['who']} ({p['year']}): {p['title']}", p["shows"], p["takeaway"], {"links": [{"t": "arXiv or source", "href": p["url"], "s": p["verified"]}]}] for p in sorted(papers, key=lambda x: x["theme"])]}]})

    # ---- latest research (2025 to 2026 batch)
    byid = {p["id"]: p for p in papers}
    def ev(*ids):
        return {"links": [{"t": f"{byid[i]['who'].split(' (')[0].replace(' et al.', '')} {byid[i]['year']}", "href": byid[i]["url"], "s": byid[i]["verified"]} for i in ids]}
    changes = [
        ["A delete flag is not erasure",
         "Soft-deleted vectors stay in index files and can be partly rebuilt into text, such as names and places. Deleted facts survive in summaries and caches. Memory layers finished at most 1.5% of forget requests end to end.",
         "Encrypt every index entry with a key per record or per epoch, so deleting means destroying a key. Record which derived items came from each source. Run a probe query after every deletion and fail the request if the data comes back.",
         "Tombstones, answer cache, lessons store, personal zone",
         ev("ghost-vectors", "afterdeletebench", "bemula", "exec-state-unlearning", "aubench")],
        ["Vectors are as sensitive as the text",
         "Embeddings can be inverted without training. Yes or no probes reveal whether a document exists. The retrieved set alone, even unordered, can reveal the embedding model.",
         "Keep vectors encrypted at rest, hide the existence of pointers the caller cannot see, return the same answer for hidden and absent, and rate-limit probing per caller.",
         "Index store, query planner, rate budget",
         ev("zero2text", "interrogation-attack", "embedding-inference-attack")],
        ["Access checks belong in code, not in the model",
         "Top models do not reliably limit sharing to authorized users. Prompt guardrails against poisoned tool text were mostly ineffective.",
         "Keep the permission check as a deterministic step before any text reaches a model or another agent. Add adaptive red-team tests before claiming the brain is injection-safe.",
         "Live recheck, scope guard, output filter",
         ev("pisas", "mcp-tdp", "oob-adaptive-eval", "injection-firewalls")],
        ["Trust labels must cross agent calls",
         "CaMeL guarantees do not compose when one agent calls another. A provenance-carrying protocol cut attack success to 0.0% in the authors' test.",
         "Attach a trust label to every retrieved span and keep it when the result moves to a downstream agent.",
         "Answer builder, agent bridge",
         ev("multi-camel", "camel")],
        ["Tool descriptions are untrusted input",
         "Hidden instructions in tool metadata fooled many agents. The top attack success rate was 72.8% on one model, and more capable models were often more exposed.",
         "Pin and hash every connector tool description, review changes before they go live, and never let metadata widen what a tool may reach.",
         "Connector manifest, agent bridge",
         ev("mcptox", "mcp-tdp")],
        ["Memory needs an owner and a small blast radius",
         "Crafted prompts pull private records out of agent memory. Dense agent graphs leak more. Raw shared state contaminated other users in 57 to 71% of cases.",
         "One memory store per user, access control on every link between agents, and a sparse, hierarchical agent graph. Do not rely on text cleaning for saved code or tool output.",
         "Personal zone, lessons store, agent scopes",
         ev("mextra", "topology-matters", "ucc-shared-state", "aim-memory")],
        ["Live keyword calls are a real baseline",
         "Agents with only keyword tools reached over 90% of traditional RAG performance with no vector database. No paper compares a pointer index against a full-copy index.",
         "Run our own test: live keyword calls to source APIs against the index, on the same questions. Pay for embeddings only where the index wins.",
         "Query planner, evaluation set",
         ev("keyword-agentic", "ragroute", "fedrag-mapping")],
        ["Freshness wants in-place deletes and chunk hashes",
         "In-place graph updates held recall stable over long update runs. Chunk-level hashes re-processed about 10 to 15% of content in a 100-document test.",
         "Pick a vector index that deletes in place. Hash per chunk, keep a current tier and a version history. Treat the 10 to 15% figure as a hint only.",
         "Delta sync, index store, reconcile sweep",
         ev("ip-diskann", "livevectorlake", "ema-filtered", "streaming-rag")],
        ["Facts need versions and supersession",
         "Best systems reached 22.4% on tracing how changed evidence affects conclusions. Memory systems fail on time questions without explicit version data.",
         "Store a version and a superseded-by link on every fact. Test on changed-evidence cases and on multi-person team threads, not only fact lookup.",
         "Pointer record, lessons store, query planner",
         ev("recon-bench", "evermembench", "locomo-plus")],
        ["The acceptance test should look like real work",
         "Best agentic RAG scored 32.96 on cross-app multi-hop questions over documents, Slack and GitHub. Tool choice caused nearly half of failures on 70 MCP servers.",
         "Use report-style tasks that mix private and public sources, include unanswerable questions, and cap how many tools an agent sees at once.",
         "Evaluation set, agent bridge",
         ev("deep-search-enterprise", "drbench", "livemcpbench", "mcp-atlas")],
        ["Identity merges must be reversible",
         "No single entity-matching method wins across six datasets. One wrong link can chain many unrelated records together.",
         "Keep every person or project merge reversible, re-check merges that cross groups, and log who or what made each link.",
         "Entity resolver, graph",
         ev("er-in-practice", "enterprise-kg-activity")],
        ["Coding sessions are a source of reusable skills",
         "Real coding-agent session logs have been collected and mined for skills. Skills work better stored with their prerequisites.",
         "Link each captured skill to its prerequisites and to the sessions it came from, so retrieval returns the context with it.",
         "Chat capture, lessons store",
         ev("swe-chat", "codeskill", "spem")],
    ]
    backs = [p for p in papers if p.get("batch2") and p["learning_type"] == "confirms"]
    out.append({"id": "latest", "title": "What the latest papers change", "blurb": f"{sum(1 for p in papers if p.get('batch2'))} papers from 2025 and 2026, and twelve things they change or confirm.",
                "intro": "Read in October 2026. Each paper's abstract page was opened; the claims below rest on abstracts, not full texts. Several 2026 papers are preprints and not peer reviewed. The numbers are the authors' own, from their own tests. The scale findings (graph, 1-bit vectors, object-storage index, permission patching) are on the page A better core: what is backed.",
                "sections": [
                    {"h": "Twelve changes to the design", "kind": "table", "cols": ["Finding", "What the papers show", "What we change", "Where it lands", "Evidence"], "rows": changes},
                    {"h": "Papers that back what we already planned", "kind": "table", "cols": ["Paper", "What it shows", "What we take", "Link"],
                     "rows": [[f"{p['who']} ({p['year']}): {p['title']}", p["shows"], p["takeaway"], ev(p["id"])] for p in sorted(backs, key=lambda x: x["theme"])]},
                    {"h": "What the evidence does not cover", "kind": "list", "rows": [
                        "No paper compares a pointer index with live fetch against a full-copy index. This stays our own test.",
                        "No peer-reviewed paper on access-control filtering or multi-tenant vector search was found, only a vision paper and a survey.",
                        "No 2026 membership-inference paper was found, and no study of privacy in company-wide search.",
                        "The adaptive-attack test on out-of-band defences used one weak model. Stronger attacks are untested.",
                        "The chunk-hash freshness test used 100 documents. The streaming figures are self-reported.",
                        "Our own checks of the twelve changes (a deletion probe, an enterprise acceptance set, a keyword-versus-index run) are still to build."]},
                ]})

    # ---- better core at scale (verified 2026-10-24; backed items only)
    def L(*pairs):
        return {"links": [{"t": t, "href": h, "s": True} for t, h in pairs]}
    DBX = ("Dropbox, knowledge graphs and MCP", "https://dropbox.tech/machine-learning/vp-josh-clemm-knowledge-graphs-mcp-and-dspy-dash")
    HIP = ("HippoRAG 2, 2025", "https://arxiv.org/abs/2502.14802")
    LAZY = ("Microsoft, LazyGraphRAG", "https://www.microsoft.com/en-us/research/blog/lazygraphrag/")
    HFQ = ("Hugging Face, embedding quantization", "https://huggingface.co/blog/embedding-quantization")
    TPA = ("turbopuffer architecture", "https://turbopuffer.com/docs/architecture")
    TPL = ("turbopuffer limits", "https://turbopuffer.com/docs/limits")
    TP3 = ("turbopuffer ANN v3", "https://turbopuffer.com/blog/ann-v3")
    NOT = ("Notion, two years of vector search", "https://www.notion.com/blog/two-years-of-vector-search-at-notion")
    ONX = ("Onyx repository", "https://github.com/onyx-dot-app/onyx")
    core_rows = [
        ["Does it have a graph?",
         "Yes, but only as a side layer: link lists between documents, people and projects, a merge log for identities, and a ranking pass over them.",
         "Keep it as a second search leg, not the core. Build it from metadata and links, not from model-read chunks.",
         "Dropbox tried a graph database and hit latency and query-pattern problems. It now builds graphs ahead of time and ships them as bundles inside its normal index. HippoRAG 2 beat a strong dense retriever by about 3 F1 points (59.8 against 57.0); plain GraphRAG and LightRAG scored lower.",
         L(DBX, HIP)],
        ["Do not build the graph with a model over every chunk",
         "Model-built graphs cost tokens for every passage at index time.",
         "Use a model only on a few high-value sources, or at query time.",
         "In HippoRAG 2's own table, full GraphRAG took about 115.5M input and 36.1M output tokens for 11,656 passages. Microsoft says LazyGraphRAG indexing costs about 0.1% of that (its claim; no method given). Nobody has tested a model-built graph past about 12 thousand passages.",
         L(HIP, LAZY)],
        ["Store vectors as 1-bit codes, rescore the top hits",
         "The design already allows int8 or binary vectors.",
         "Make 1-bit codes the default for the big tiers, with a full-precision rescore of the top candidates.",
         "Binary codes are exactly 32 times smaller: 250M vectors of 1024 dimensions take 954 GB as float32, 238 GB as int8 and 30 GB as binary. One model kept 96.45% of retrieval quality with rescoring (92.53% without). That figure is for one model and one benchmark, so test it on our text.",
         L(HFQ, TP3)],
        ["Use a cluster index on object storage, not an all-RAM graph",
         "The vector store is left as 'graph or disk-based'.",
         "Pick a cluster (centroid) index kept on object storage with a cache in front.",
         "turbopuffer builds on object storage with a centroid index and lists 3 PB+ and 1 trillion+ documents it has seen (an observed figure, not a limit). A cold query needs 3 to 4 storage round trips, about 400 ms. No vendor publishes p95 latency at this scale, so we must measure it.",
         L(TPA, TPL, TP3)],
        ["Keep the text hash and the permission hash apart",
         "Each pointer already carries content_hash and acl_version.",
         "Treat them as two separate change signals: a permission change patches the index entry and never re-embeds.",
         "Notion stores permissions on every span. When the text hash matches and the permission hash differs, it skips embedding and patches the vector store.",
         L(NOT)],
        ["Check permissions twice: in the index and after retrieval",
         "Pre-filter in the index, then a live recheck of the top hits.",
         "Keep both. The recheck is the safety net for sources whose permissions change fast.",
         "Onyx's source code has a post-retrieval censoring step that drops chunks the user may not see, for sources with synced permissions. The docs page itself does not describe it; the code does.",
         L(ONX)],
        ["Live fetch is for the last mile, not for finding candidates",
         "Live text is fetched at question time after the index picks candidates.",
         "No change to the design. Do not replace the index with live calls to each app.",
         "Dropbox found live calls to other apps slow and uneven (one MCP query took up to 45 seconds) and rising in token use, and chose an index. This supports keeping the index. It does not test a pointer-only index, which stays our own test.",
         L(DBX)],
    ]
    out.append({"id": "core", "title": "A better core: what is backed", "blurb": "Seven findings with published backing. Anything that is only our own arithmetic is left out.",
                "intro": "Read and checked on 24 October 2026. Each source below was opened by a second reviewer. Costs in dollars, tier sizes and latency budgets at a petabyte are not here, because no source publishes them and our own sums are not evidence. The cards these findings change are ix_vec, ix_embed, ix_ptr, ix_link, ix_ent, qr_graph, qr_hyb, qr_live, ac_store and ac_live.",
                "sections": [
                    {"h": "What the research backs", "kind": "table", "cols": ["Finding", "Our design today", "Change", "What the sources show", "Sources"], "rows": core_rows},
                    {"h": "What stays unproven", "kind": "list", "rows": [
                        "No source tests a pointer index with live fetch against a full-copy index.",
                        "No vendor publishes p95 latency at billions of vectors. We need our own filtered-search test with permissions on and a cold cache.",
                        "No public benchmark tests permissions and freshness together at scale.",
                        "How many data tiers to run, and where to cut between them, is our own judgment. It stays out until we measure real usage.",
                        "Qdrant, Weaviate, OpenFGA and SpiceDB scale numbers were not read."]},
                ]})

    # ---- company brain papers (read 2026-10-30), rows derived from refs.jsonl so a link fix reaches the page
    cb = {r["key"]: r for r in (json.loads(l) for l in (RES / "refs.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()) if r["key"].startswith("p26")}
    def cbl(*keys):
        return {"links": [{"t": cb[k]["cite"].split(":")[0], "href": cb[k]["url"], "s": True} for k in keys]}
    cb_rows = [
        ["Organise before you retrieve", "Search ran over every chunk.", "A catalog and metadata filters pick candidate ids first; the permission filter works on the same set.", "ix_cat, qr_scope", cbl("p26_org")],
        ["Agents browse knowledge as files", "Only search and answer tools.", "A skill-style start file, topic indexes and linked entries, rendered from the index with the caller's permissions.", "ll_browse, cp_lib", cbl("p26_kas", "p26_org")],
        ["Cross-user leakage needs no attacker", "Pre-filter plus a live recheck.", "A hard code gate on owner and zone after ranking, with a counted alarm.", "ac_gate", cbl("p26_memleak")],
        ["Search raw chat like a person would", "Plain hybrid search for chat.", "A budgeted agent loop with four chat-native controls, and chat chunks kept as whole threads with channel, actor and artifact views.", "qr_loop, cf_struct", cbl("p26_refind", "p26_egc")],
        ["Old facts and new facts mix", "Ranking only.", "Each passage is labelled current, superseded or contradicted; set and negation questions get their own checks.", "qr_life", cbl("p26_lace", "p26_moss")],
        ["A failed step should change the plan", "Fixed plan, one pass.", "A reviser names the failure from a closed list and picks a repair, at most three times.", "qr_rev", cbl("p26_retail", "p26_scair")],
        ["Business terms change over time", "Definitions lived in prose.", "Versioned definitions with validity windows, looked up by the question's date.", "ix_def", cbl("p26_agentonto", "p26_unidata", "p26_onto")],
        ["Tell people what changed", "The brain only answered questions.", "Change events are matched to owners, scored with a daily cap, and sent as cited notes.", "ll_delta, ll_score, ll_note", cbl("p26_ctxgraph", "p26_kcis")],
        ["Tacit know-how is worth capturing", "No path from solved cases to reusable experience.", "Drafts of six-field cited case cards, reviewed by the owner and filed in six libraries.", "cp_exp, cp_lib, zn_review", cbl("p26_kupas", "p26_myskill", "p26_aquillm", "p26_praxis", "p26_clm")],
        ["Silent failure is the common one", "Freshness lag only.", "A heartbeat per app and path, a failure attributor, and versioned releases with a judge and rollback.", "op_beat, op_attr, op_ver", cbl("p26_infra", "p26_linkedin")],
        ["Chunking affects every later step", "Chunk by size and structure.", "No change yet. The paper on normalised conversion is noted for a later test of the chunker.", "ix_chunk", cbl("p26_drac")],
    ]
    cb2_rows = [
        ["A card is a guess until checked", "Cards went from draft to owner review.", "Each claim is probed against the live source, read only and as the contributor, before review.", "cp_probe", cbl("p26b_ground")],
        ["Do not shelve the same case twice", "Cards were filed as they came.", "A draft is compared with its five nearest cards and marked new, duplicate, clarify or conflict.", "cp_dup", cbl("p26b_sap")],
        ["Evidence sets the trust tier", "Owner approval was the only gate.", "A card is a prediction, core after three independent cases, anchor after ten clean cycles.", "cp_trust", cbl("p26b_kl", "p26b_sap")],
        ["One meaning, many sources", "A passage was labelled current or superseded.", "Claims and attestations with a locator and hash; strength is computed when read; expired claims go dormant.", "ix_att, qr_life", cbl("p26b_secbrain", "p26b_kl")],
        ["A summary can leak its source", "Cards had an owner and a zone.", "Each card lists its sources; visibility is the intersection of the asker's rights, rechecked lazily.", "ac_lin, ac_gate", cbl("p26b_akasic")],
        ["Where a pointer index stops", "Pointer only, with no stated limit.", "A store-or-point table: pointer, filters and a 300-character excerpt by default; notes only with sources and an owner.", "gv_line", cbl("p26b_akasic", "p26b_acm")],
    ]
    out.append({"id": "brainpapers", "title": "Company-brain papers: what we took", "blurb": "28 papers from April to October 2026 and the part of the brain each one changed.",
                "intro": "Read on 30 October 2026 from the paper abstracts and the sections that describe the method. Numbers from the papers are not repeated on the cards; where a card gives a number it is our design value and says so. The new cards are in the groups Query plan, Retrieve, Answer, Enforce, Serve to agents, Proactive surfacing, Tacit experience, Zones, Freshness and Quality.",
                "sections": [
                    {"h": "What changed and where", "kind": "table", "cols": ["Idea", "Before", "Now", "Cards", "Papers"], "rows": cb_rows},
                    {"h": "Second batch: memory and knowledge layer", "kind": "table", "cols": ["Idea", "Before", "Now", "Cards", "Papers"], "rows": cb2_rows},
                    {"h": "What stays unproven", "kind": "list", "rows": [
                        "No paper tests these ideas on a pointer index with live fetch. Scoping, the loop and the lifecycle labels need our own golden-set test.",
                        "Whether the plan reviser and the failure attributor name the right stage is not measured. The first release logs and a person confirms.",
                        "Case cards help agents in the papers' domains; whether people here review them is open.",
                        "The chunking paper is noted but changes no card.",
                        "Second batch: none of the six papers tests a pointer index. The probe gain sits inside its error bars. The tier numbers (3 cases, 10 cycles) are one author's examples. The access paper has no experiments. The security-brain paper tested documents only.",
                        "Second batch: four papers (2610.30445, 2607.23586, 2606.04037, 2605.19151) cover agent governance and authority. They say little about the brain and changed no card.",
                        "Vendor numbers from Atlan, Zamp and Slite were not verified; the eToro case study page returned HTTP 410."]}]})

    # ---- repos
    out.append({"id": "repos", "title": "Repositories: install or build", "blurb": f"{len(repos)} open-source projects, grouped by the layer they could fill.",
                "intro": "Install the parts that are commodity. Build the permission sync, the pointer schema, the freshness rules and the answer layer. Licences marked NOASSERTION mean GitHub could not detect one; read the repository before use.",
                "sections": [{"h": "By layer", "kind": "table", "cols": ["Layer", "Project", "Licence", "What it does", "Fit for the brain", "Limits", "Link"],
                              "rows": [[r["layer"], r["name"], r["licence"].split(" ")[0], r["what"], r["fit"], r["limits"], {"links": [{"t": f"GitHub, {r['stars']} stars", "href": r["url"]}]}] for r in sorted(repos, key=lambda x: x["layer"])]}]})

    # ---- build plan by milestone (from builds/*.json)
    builds = {}
    for f in sorted((HERE / "builds").glob("*.json")):
        builds.update(json.loads(f.read_text(encoding="utf-8")))
    ms_name = {"M0": "Walking skeleton: one app, memory adapters, one search tool that returns pointers",
               "M1": "Freshness: webhooks, delta cursors, sweep, deletes", "M2": "Permissions: access lists, pre-filter, live recheck, zones and credential modes",
               "M3": "Retrieval quality: hybrid search, rerank, contextual lines, evals", "M4": "AI clients and chat capture: sign-in, rollout and the companion app",
               "M5": "Scale and governance: erasure, keys, tenants, cost, kill switch, action agent"}
    plan_sections = [{"h": "Milestones at a glance", "kind": "table", "cols": ["Milestone", "Goal", "Cards", "Engineer-days"],
                      "rows": [[m, ms_name[m], str(sum(1 for b in builds.values() if b["milestone"] == m)),
                                str(round(sum(b["effort_days"] for b in builds.values() if b["milestone"] == m), 1))] for m in sorted(ms_name)]}]
    for m in sorted(ms_name):
        rows = sorted(((cid, b) for cid, b in builds.items() if b["milestone"] == m), key=lambda t: (len(t[1].get("depends_on", [])), t[0]))
        plan_sections.append({"h": f"{m}. {ms_name[m]}", "kind": "table", "cols": ["Card", "Days", "Build after", "First pick"],
                              "rows": [[{"links": [{"t": model["comps"][cid]["label"], "href": f"#/c/{cid}"}]}, str(b["effort_days"]),
                                        ", ".join(model["comps"][d]["label"] for d in b.get("depends_on", [])) or "nothing",
                                        b["stack"][0]["pick"]] for cid, b in rows]})
    out.append({"id": "plan", "title": "Build plan by milestone", "blurb": "Every card, ordered by milestone and what it needs first.",
                "intro": "Total effort is one engineer's honest estimate per card. Open a card for the exact install, files, schema, code and steps.",
                "sections": plan_sections})

    # ---- AI clients compared
    cl = json.loads((RES / "clients.json").read_text(encoding="utf-8"))
    out.append({"id": "clients", "title": "AI clients compared", "blurb": "How Claude, Codex, ChatGPT, Cursor, Copilot, Gemini and others connect, sign in and roll out.",
                "intro": "Read from vendor pages. Rows marked snippet came from search results, not the full page.",
                "sections": [{"h": f"{len(cl['clients'])} clients", "kind": "table", "cols": ["Client", "How it connects", "Sign-in", "Org rollout", "Limits"],
                              "rows": [[c["name"], flat_cell(re.sub(r"\bv(\d)", r"version \1", c["mechanism"])), flat_cell(c["auth"]), flat_cell(c["org_distribution"]), flat_cell(c["limits"])] for c in cl["clients"]]},
                             {"h": "What this means for the design", "kind": "list", "rows": cl["design_implications"]}]})


    # ---- competitors: what other company brain products do (exact links)
    p2 = json.loads((RES / "products2.json").read_text(encoding="utf-8"))
    flag = {"ok": "page read", "snippet": "search snippet only", "failed": "page not loaded, not assessed"}
    comp_sections = []
    for cat in sorted({r["category"] for r in p2}):
        comp_sections.append({"h": cat[2:].capitalize() if cat[1] == " " else cat, "kind": "table",
                              "cols": ["Product", "What it does", "How it differs from Devx Brain", "Evidence"],
                              "rows": [[{"links": [{"t": r["name"], "href": r["url"]}]}, r["what_it_does"], r["how_it_differs_from_us"], flag[r["status"]]]
                                       for r in p2 if r["category"] == cat]})
    lack = ["Agents that act: Glean, Atlassian Rovo, Moveworks, Dust and Writer ship first-party agents and a build platform. Devx Brain is read-only and hands writes to a separate action agent.",
            "Writes and curation: Guru verifies and re-verifies cards, Notion AI and Rovo write back. We store no content, so there is nothing to curate.",
            "Temporal knowledge graphs: Zep and Graphiti track when a fact was true. Our index has entity merging but no validity windows.",
            "Meeting, screen and voice capture: Granola, Fireflies, Otter, Fathom, Screenpipe and Microsoft Recall record what happens on a desktop. We capture AI chats and work activity only.",
            "Agent session sharing: GitHub Copilot Spaces and Memory, Warp, Entire and Claude Code analytics share or trace agent sessions for a team.",
            "Hosted comfort: Glean, Copilot and Gemini Enterprise need no install. Ours needs a connector runtime and, for chat capture, a companion app on each laptop."]
    unique = ["Pointer-only index with live per-user fetch. Our search of the vendor pages found this design described nowhere else. Absence on a marketing page is not proof, so treat this as our inference.",
              "Personal data never leaves its owner. Every pointer carries a zone and an owner, and personal rows are encrypted with a per-user key.",
              "No credential tools. An agent that queries the brain has no call that returns a stored token, and a build test fails if one appears.",
              "A gap report that shows what the admin crawl cannot see, so nobody assumes the index is complete.",
              "Works with the AI clients people already use (Claude, Codex, Cursor, Copilot, Gemini, ChatGPT) instead of asking them to adopt one more app."]
    out.append({"id": "competitors", "title": "What other company brains do", "blurb": f"{len(p2)} products with exact links, grouped by what they are. Onyx is closest to us in shape.",
                "intro": "Four kinds of product overlap with the brain: enterprise search that acts as a company brain, personal and team capture tools, agent memory layers, and tools that capture AI sessions for a team. Public prices seen: Microsoft Copilot Business from $18 per user per month (promotion to 2026-12-31) up to $32, Otter Business $19.99, AgentOps Pro $40 per month. Two pages (Mem, Heyday) failed to load and are not assessed. Limitless stopped capture on 2025-12-19 after Meta bought it.",
                "sections": comp_sections + [{"h": "Features they have that Devx Brain lacks", "kind": "list", "rows": lack},
                                             {"h": "What we do that they do not", "kind": "list", "rows": unique}]})

    # ---- chat capture feasibility
    chdr, crows = md_table(RES / "capture.md", "Table")
    cgaps = md_list(RES / "capture.md", "What we cannot get")
    cdel = md_list(RES / "capture.md", "Deletion and retention")
    out.append({"id": "capture", "title": "Capturing AI chats: what each vendor allows", "blurb": "Route, who can use it, real-time or batch, whether deletes show up, and what we cannot get.",
                "intro": "The brain stays read-only. Chats come in through two routes: admin feeds that vendors offer, and a companion app on each laptop that reads Claude Code and Codex session files. MCP has no way to read chat history, so a connector alone cannot do this. A delete only shows up when the next feed or hook run reports it.",
                "sections": [{"h": "Route by vendor", "kind": "table", "cols": chdr, "rows": [[flat_cell(c) for c in r] for r in crows]},
                             {"h": "Deletion and retention", "kind": "list", "rows": cdel},
                             {"h": "What we cannot get", "kind": "list", "rows": cgaps}]})

    # ---- standalone-app decisions
    sa = {r["key"]: r for r in json.loads((RES / "standalone.json").read_text(encoding="utf-8"))}
    sec = {r["key"]: r for r in json.loads((RES / "security.json").read_text(encoding="utf-8"))}

    def ev(*keys):
        links, bits = [], []
        for k in keys:
            r = sa.get(k) or sec.get(k)
            bits.append(f"{r['status']}")
            if r.get("url"):
                links.append({"t": r["cite"] if "cite" in r else k, "href": r["url"]})
        return {"links": [{"t": "Evidence: " + ", ".join(bits), "href": "none"}] + links} if links else "Evidence: none read"
    dec7 = [
        ["1. Law and consent", "Tell employees what is captured, keep personal chats out by default, and let counsel decide per country. In Germany a works council may need to agree before any capture tool starts.",
         "Not legal advice. The EU AI Act article on workers applies to high-risk systems only, and its dates were not checked. Notice rules for California and New York and SOC 2 scope were not researched.", ev("ai-act-26", "betrvg", "erasure")],
        ["2. Hosted or customer cloud", "Offer both from one codebase. Glean runs a vendor-hosted tenant or a tenant inside the customer's cloud, so the pattern exists.",
         "Source for Glean is a search snippet. Dust, Onyx, Sana and Moveworks were not researched.", ev("glean-dep", "glean-tenancy")],
        ["3. Offboarding", "On leave: revoke the user's grants, crypto-shred the personal key, drop personal rows, keep company rows that point to company sources.",
         "Provider revocation steps and a legal hold rule were not researched. Erasure may be refused when the law requires a record.", ev("erasure", "slack-rotation", "google-dwd")],
        ["4. Identity", "Company sign-in once. Map users by email or directory feed. Admin consent happens once per tenant.",
         "SCIM and sign-in setup per provider were not researched. Microsoft admin consent covers the whole org; Google domain-wide delegation reaches every user without per-user consent.", ev("entra-consent", "google-dwd", "rfc8693")],
        ["5. Cost", "Embeddings are cheap next to the live fetch and the model call. Storage is the other line. Run the numbers per company with real counts before quoting a price.",
         "Prices seen are third-party snippets and no cost per million documents was computed. Competitor prices were partly not obtained.", ev("embed-price", "pinecone")],
        ["6. Vendor dependence", "Keep the chat feeds optional and per vendor, since each vendor can change or remove its API. Limitless shows how fast capture can end.",
         "Anthropic's connector directory rules and desktop extension allowlist came from snippets. An IP allowlist alone is not enough: one user report says traffic did not arrive from the published range.", ev("limitless", "dir-submit", "dxt-allow", "ip-range-issue")],
        ["7. Proof of safety", "Run a leak test suite in CI: ask as user A for user B's data and fail the build on any hit. Add retrieval logs that cannot be edited.",
         "No public benchmark for authorization leaks in retrieval was found. SOC 2 and ISO 27001 scope was not researched.", ev("rag-leak", "owasp-llm08", "owasp-llm")]]
    out.append({"id": "decisions", "title": "Seven decisions for a standalone app", "blurb": "Law, deployment, offboarding, identity, cost, vendor risk and proof of safety, each with an honest evidence flag.",
                "intro": "If the brain is its own app, these questions come with it. Each row gives our default and what is still open. Rows marked snippet came from search results and need a read of the full page before anyone relies on them.",
                "sections": [{"h": "Question, default, open items, evidence", "kind": "table", "cols": ["Question", "Our default", "Still open", "Evidence"], "rows": dec7}]})

    # ---- zones and credentials
    zrows = [["Company", "Admin app-only grant, once per tenant", "Everyone who passes the source's own access list", "Built by the company crawl"],
             ["Team", "Admin grant, filtered by group", "Members of the group at the source", "Built by the company crawl"],
             ["Personal", "The owner's own grant only", "The owner alone; filtered on owner id inside the query", "Built only with the owner's token; encrypted with a per-user key"]]
    modes = [["Default", "Admin consent once. People sign in once through company sign-in. Identity maps by email or directory. Personal data needs the owner's own link."],
             ["Strict", "Every source uses the user's own grant. The index only holds what each person could see. Slower first sync, smallest blast radius."],
             ["Merged view", "When the same document is seen both ways, the stricter access list wins."],
             ["Gap report", "Shows what the admin crawl cannot see (private files, personal chats) so nobody assumes the index is complete."]]
    sr = ["Only the connector runtime can decrypt a token. Query code, rerank code and the model never see one.",
          "Admin tokens and user tokens sit under separate keys and roles in the key service.",
          "No credential tool exists. A build test fails if any tool returns a token, key or password.",
          "Secrets are scanned out twice: when text is indexed and when an answer leaves (gitleaks-style rules plus an entropy check).",
          "Each agent gets a per-agent scope. The lethal trifecta guard blocks a run that has private data, untrusted content and a way out together.",
          "Egress is an allowlist. Links and images are stripped from answers so a poisoned page cannot send data out by URL.",
          "Retrieved text is untrusted. Derived data (answer cache, entity merges, lessons, traces) inherits the zone and owner of its sources."]
    srcs = [[{"links": [{"t": r["cite"], "href": r["url"]}]}, r["status"], short(r["claim"])] for r in sec.values() if r.get("url") and r["status"] != "failed"]
    out.append({"id": "zones", "title": "Zones, credentials and agent security", "blurb": "Who can see what, which grant builds each zone, and how an agent is kept from reaching stored credentials.",
                "intro": "Three zones are enforced inside the index, not in the answer. Every pointer carries a zone and an owner id taken from the source's own sharing setting, never from a model's guess. Personal rows are filtered on owner id inside the query. A move from personal to team happens only when the source's sharing changes or the owner confirms.",
                "sections": [{"h": "Three zones", "kind": "table", "cols": ["Zone", "Built with", "Who can read", "Notes"], "rows": zrows},
                             {"h": "Credential modes", "kind": "table", "cols": ["Mode", "How it works"], "rows": modes},
                             {"h": "Keeping credentials away from agents", "kind": "list", "rows": sr},
                             {"h": "Rules taken from other company brains", "kind": "list", "rows": [
                                 "No lending of personal connections. Supermemory lets a teammate lend a personal tool connection for one request (a 10-minute grant, and an unanswered request expires after 15). We forbid it by default: a personal token serves only its owner's requests. If a lease is ever added, it needs a time limit, an owner prompt and an audit row.",
                                 "No silent joins across private zones. A personal view may read the asker's own rows plus every private channel they belong to, which is how Supermemory answers DMs. Each zone is queried under its own filter, the answer carries the highest zone of its inputs, and the audit row lists every zone used.",
                                 "Tool connections shared by the org are read-only. Writes use the asker's own connection and wait for an approval that only the asker can give."]},
                             {"h": "Sources behind these rules", "kind": "table", "cols": ["Source", "Status", "What it says"], "rows": srcs}]})

    # ---- limits
    gaps = md_list(RES / "techniques.md", "Open gaps")
    out.append({"id": "limits", "title": "What is not covered", "blurb": "Gaps in the research and claims that rest on thin evidence.",
                "intro": "Read this before quoting any number from the diagram.",
                "sections": [{"h": "Gaps the research pass reported", "kind": "list", "rows": gaps + [
                    "No paper tests a pointer index with live fetch against a full-copy index. The design is our inference.",
                    "Several products and papers were read from search snippets, not the full page. The References page marks each source's status.",
                    "Only arXiv was searched for papers; venues without arXiv copies are missing.",
                    "Delta APIs were not found for Notion, Jira, GitHub, HubSpot, Linear and Figma. The sweep and poll cover them in the design.",
                    "Slack's terms bar a persistent index of its API data. Treat Slack as live query only until counsel confirms.",
                    "Sixteen repositories carry a NOASSERTION licence flag. Check each before adopting.",
                    "Numbers marked (design) are our starting points to tune, not measurements.",
                    "The Meta article on its AI second brain was read in a browser, not from a saved copy. Its figures (63,000 installs, about 10,000 daily users) count installs and daily users, and its rate-limit incident is one company's account."]},
                    {"h": "Decided against, for now", "kind": "list", "rows": [
                        "Full document summaries stored in the index. A summary is derived text: it goes stale when the source changes, it needs erasure with the source, and a model that reads its own summaries can loop on them (Marco calls this workslop). The catalog row keeps one short line per document instead. If summaries are added later, tag them as derived, regenerate them on every version change, and never count one as a source."]},
                    {"h": "Planned for the next version", "kind": "list", "rows": [
                        "Heading tree per document. One row per section with section id, level, title, character offsets, token count and version. Offsets are tied to the document version and reset when it changes. The tree uses the document's access list through acl_ref, is encrypted like snippets and is deleted with the pointer. It lets the fetcher pull one section live instead of the whole file, and lets the reranker return a section instead of a chunk."]},
                    {"h": "Terms used on these pages", "kind": "table", "cols": ["Term", "Meaning"], "rows": GLOSSARY}]})
    return out
