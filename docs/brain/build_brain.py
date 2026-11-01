#!/usr/bin/env python3
"""Build the Devx Brain drill-down. Reuses the engine in ../lld/build.py with the brain's data.

  python3 -I build_brain.py --gate-only --all   run every gate, print all errors
  python3 -I build_brain.py                     gate, then write model.json and ../html/devx-brain-drilldown.html
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "lld"))
sys.path.insert(1, str(HERE))
import build as B  # noqa: E402
import xc_brain  # noqa: E402

B.HERE = HERE
B.OUT_HTML = HERE.parent / "html" / "devx-brain-drilldown.html"
B.OUT_MODEL = HERE / "model.json"
# the reference project's own cross-checks do not apply to this model
B.xc_pages.check = lambda sk: []
B.foldin.check = lambda sk, authored: []
B.stack.check = lambda *a, **k: []

B.TEMPLATE_PATCHES[0] = ("<title>ST Engineering Supplier Resilience - Drill-down LLD</title>",
                         "<title>Devx Brain</title>")
B.TEMPLATE_PATCHES[1] = (B.TEMPLATE_PATCHES[1][0],
                         '<div class="crumbs" style="margin-top:2px"><a href="#x.stack">Build order →</a><a href="#x.plan">Build plan →</a><a href="#x.clients">AI clients →</a><a href="#x.design">13 design decisions →</a>'
                         '<a href="#x.products">Products compared →</a><a href="#x.apps">App by app →</a><a href="#x.ladder">Scaling ladder →</a>'
                         '<a href="#x.brainpapers">Papers read →</a><a href="#x.limits">What is not covered →</a><a href="#x.refs">References →</a></div>')
OV = "const FIRST=['stack','firstagent','harnesses','mdfiles','engine']"
assert OV in B.OVERVIEW_JS
B.OVERVIEW_JS = B.OVERVIEW_JS.replace(OV, "const FIRST=['stack','plan','clients','design','limits']")

VISIBLE_BANNED = [(re.compile(r"\bCompany[- ]OS\b"), "Company OS"), (re.compile(r"\bDevx OS\b"), "Devx OS"), (re.compile(r"company-os-v2"), "company-os-v2"), (re.compile(r"\bv2\b", re.I), "v2"), (re.compile("—"), "em dash"),
                  (re.compile("[\U0001F300-\U0001FAFF☀-➿]"), "emoji")]


# ---- "How to build it": per-card build blocks live in builds/*.json ({comp_id: block}) and are merged into deep.build
BUILD_CSS = ("code,.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}",
             "code,.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px}"
             "pre.code{background:#0f172a;color:#e2e8f0;padding:12px 14px;border-radius:6px;overflow:auto;font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace;margin:6px 0 12px;white-space:pre}"
             ".buildbox{border-left:3px solid #1f4fd8;padding-left:14px}")
B.TEMPLATE_PATCHES.append(BUILD_CSS)
B.TEMPLATE_PATCHES.append(("['purpose','Purpose'],", "dp.build?['build','How to build it']:null,['purpose','Purpose'],"))
B.TEMPLATE_PATCHES.append(("    sec+=`<div class=\"sec\" id=\"sx-purpose\">", r"""    if(dp.build){const bd=dp.build, pre=t=>t?`<pre class="code">${esc(t)}</pre>`:'', kv=o=>Object.entries(o||{}).map(([k,v])=>`<tr><td class="mono">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
      sec+=`<div class="sec buildbox" id="sx-build"><h3>How to build it</h3><p class="sub">Milestone ${esc(bd.milestone)}. About ${esc(bd.effort_days)} engineer-days. Build after: ${(bd.depends_on||[]).length?bd.depends_on.map(d=>D.comps[d]?`<a href="#/c/${d}">${esc(D.comps[d].label)}</a>`:esc(d)).join(', '):'nothing, start here'}.</p>
      <h4>What to pick</h4><table class="t3">${(bd.stack||[]).map(x=>`<tr><td><b>${esc(x.part)}</b></td><td>${esc(x.pick)}</td><td>${esc(x.why)}</td></tr>`).join('')}</table>
      <h4>Install and scaffold</h4>${pre((bd.install||[]).join('\n'))}<h4>Files to create</h4>${ul(bd.layout)}
      <h4>Data shape</h4>${pre(bd.schema)}<h4>Interface</h4>${pre(bd.interface)}<h4>Core code</h4>${pre(bd.code)}
      <h4>Build steps, in order</h4><ol>${(bd.steps||[]).map(x=>`<li>${esc(x.do)}<br><i>Done when: ${esc(x.done_when)}</i></li>`).join('')}</ol>
      <h4>Config and defaults</h4><table class="t3">${kv(bd.config)}</table>
      <h4>Prove it works</h4>${pre((bd.verify||[]).join('\n'))}<h4>Traps</h4>${ul(bd.pitfalls)}</div>`;}
    sec+=`<div class="sec" id="sx-purpose">"""))

BUILD_STR = ("part", "pick", "why")


def load_builds():
    out, errs = {}, []
    for f in sorted((HERE / "builds").glob("*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            errs.append(f"{f.name}: bad json {e}")
            continue
        for k, v in d.items():
            if k in out:
                errs.append(f"{f.name}: duplicate build for {k}")
            out[k] = v
    return out, errs


def build_gate(authored, builds, comp_ids):
    errs = []
    for cid in comp_ids:
        b = builds.get(cid)
        if not b:
            errs.append(f"build {cid}: missing")
            continue
        p = f"build {cid}"
        st = b.get("stack")
        if not isinstance(st, list) or len(st) < 2 or any(not all(x.get(k) for k in BUILD_STR) for x in st if isinstance(x, dict)):
            errs.append(f"{p}: stack needs >= 2 rows with part/pick/why")
        for k, n in (("install", 2), ("layout", 2), ("verify", 2), ("pitfalls", 2)):
            if not isinstance(b.get(k), list) or len(b[k]) < n:
                errs.append(f"{p}: {k} needs >= {n}")
        for k, n in (("schema", 40), ("interface", 40), ("code", 200)):
            if not isinstance(b.get(k), str) or len(b[k].strip()) < n:
                errs.append(f"{p}: {k} missing or under {n} chars")
        stp = b.get("steps")
        if not isinstance(stp, list) or len(stp) < 4 or any(not (x.get("do") and x.get("done_when")) for x in stp if isinstance(x, dict)):
            errs.append(f"{p}: steps needs >= 4 with do/done_when")
        if not isinstance(b.get("config"), dict) or len(b["config"]) < 3:
            errs.append(f"{p}: config needs >= 3 keys")
        if not re.fullmatch(r"M[0-5]", str(b.get("milestone", ""))):
            errs.append(f"{p}: milestone must be M0..M5")
        if not isinstance(b.get("effort_days"), (int, float)) or not 0 < b["effort_days"] <= 30:
            errs.append(f"{p}: effort_days must be 0-30")
        for d in b.get("depends_on", []):
            if d not in comp_ids or d == cid:
                errs.append(f"{p}: bad depends_on {d}")
        for path, t in strings(b, cid):
            for rx, name in VISIBLE_BANNED:
                if rx.search(t):
                    errs.append(f"{p}: {path} contains {name}")
    for cid in builds:
        if cid not in comp_ids:
            errs.append(f"build {cid}: no such component")
    return errs


def strings(o, path=""):
    if isinstance(o, str):
        yield path, o
    elif isinstance(o, dict):
        for k, v in o.items():
            yield from strings(v, f"{path}.{k}")
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from strings(v, f"{path}[{i}]")


def extra_gate(authored, refs):
    errs = []
    for cid, c in authored["comps"].items():
        for path, t in strings(c, cid):
            for rx, name in VISIBLE_BANNED:
                if rx.search(t):
                    errs.append(f"{path}: contains {name}")
        if not (c.get("prop") or c.get("req")):
            errs.append(f"card {cid}: no requirement and no proposal")
        if not c.get("deep", {}).get("refs"):
            errs.append(f"card {cid}: deep.refs empty")
    for gid, g in authored["groups"].items():
        for path, t in strings(g, gid):
            for rx, name in VISIBLE_BANNED:
                if rx.search(t):
                    errs.append(f"group {path}: contains {name}")
    return errs


def finish(model, sk, refs):
    n_comp = len(model["comps"])
    n_edge = sum(len(s["edges"]) for s in model["stages"])
    n_grp = sum(len(s["groups"]) for s in model["stages"])
    st = json.loads((HERE / "stack.json").read_text(encoding="utf-8"))
    g2l = {g: L["n"] for L in st["layers"] for g in L["groups"].split()}
    model["stack"] = {"layers": [{**{k: L[k] for k in ("id", "n", "title", "ceiling", "why_first", "exit_test", "built", "stubs")},
                                  "groups": [g.split(".") for g in L["groups"].split()]} for L in st["layers"]], "g2l": g2l}
    model["meta"] = {
        "overview_title": "Devx Brain: connect every app, index it, never copy it",
        "overview_sub": (f"{len(model['stages'])} stages, {n_grp} groups, {n_comp} components. The brain keeps pointers, search vectors and access lists, "
                         "and fetches the real text from the app when someone asks. Pick a stage to go one level down."),
        "counts": {"stages": len(model["stages"]), "groups": n_grp, "components": n_comp, "edges": n_edge, "edges_more": 0,
                   "refs": len(model["refs"]), "layers": len(st["layers"])},
        "refs_researched": len(refs),
    }
    model["xc"] = xc_brain.pages(model, sk, refs) + B.generated_xc(model)
    return model


def main(argv):
    sk = B.load_json(HERE / "skeleton.json")
    for s in sk["stages"]:
        s.setdefault("blocks", [])
    refs, ref_errs = B.load_refs()
    authored, load_errs = B.load_authored()
    builds, build_errs = load_builds()
    for cid, b in builds.items():
        if cid in authored["comps"]:
            authored["comps"][cid].setdefault("deep", {})["build"] = b
    bgate = build_gate(authored, builds, set(sk["comps"])) if "--no-build" not in argv else []
    errs = B.gate(sk, authored, refs, ref_errs, load_errs + extra_gate(authored, refs) + build_errs + bgate)
    print(f"skeleton: {len(sk['stages'])} stages, {len(sk['comps'])} components | authored cards: {len(authored['comps'])} "
          f"| refs: {len(refs)} | authored edges: {len(authored['edges'])} | gate errors: {len(errs)}")
    if errs:
        cap = len(errs) if "--all" in argv else 60
        print("\n".join(errs[:cap]))
        if len(errs) > cap:
            print(f"... and {len(errs) - cap} more (use --all)")
        return 2
    if "--gate-only" in argv:
        return 0
    model = finish(B.build_model(sk, authored, refs), sk, refs)
    leaks = [f"{p}: {n}" for p, t in strings(model["xc"]) for rx, n in VISIBLE_BANNED if rx.search(t)]
    leaks += [f"meta: {n}" for p, t in strings(model["meta"]) for rx, n in VISIBLE_BANNED if rx.search(t)]
    if leaks:
        print("\n".join(leaks[:40]))
        return 3
    B.OUT_MODEL.write_text(json.dumps(model, ensure_ascii=False, indent=1), encoding="utf-8")
    B.OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    B.OUT_HTML.write_text(B.render_html(model), encoding="utf-8")
    print(f"wrote {B.OUT_HTML} ({B.OUT_HTML.stat().st_size // 1024} KB) counts={model['meta']['counts']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
