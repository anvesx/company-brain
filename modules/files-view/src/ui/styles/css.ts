/** Module CSS. Uses only design-system custom properties, so light and dark follow prefers-color-scheme. */
export const filesCss = `
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
nav.top{display:flex;gap:var(--s-4);align-items:baseline;border-bottom:1px solid var(--rule);margin:0 0 var(--s-5);padding:0 0 var(--s-3)}
nav.top a{padding:var(--s-1) 0}nav.top a[aria-current=page]{color:var(--ink);font-weight:600;text-decoration:none;border-bottom:2px solid var(--accent)}nav.top .who{margin-left:auto}
.fresh{margin:0 0 var(--s-4)}
form.filters{max-width:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--s-3);align-items:end;margin:0 0 var(--s-5)}
form.filters .field{margin:0}form.filters .q{grid-column:1/-1}
.field select{width:100%;font:inherit;padding:var(--s-2) var(--s-3);min-height:40px;border:1px solid var(--control);border-radius:0;background:var(--paper);color:var(--ink)}
.field input,.field select{box-sizing:border-box;min-height:40px}
.field select:focus-visible{border-color:var(--ink)}
.files td,.files th{vertical-align:top}.table.files td:last-child,.table.files th:last-child{text-align:left}.table.files td.num,.table.files th.num{text-align:right}.files td.num,.files td time{white-space:nowrap}
.files th a{color:inherit;text-decoration:none}.files th a:hover,.files th a:focus-visible{text-decoration:underline}
.files td.title a{font-weight:500;overflow-wrap:anywhere}.files .sub{display:block;color:var(--muted);font-size:13px;line-height:20px}
.paths{list-style:none;margin:0;padding:0;display:grid;gap:var(--s-2)}
.crumb{font-size:13px;line-height:20px}.crumb .sep{color:var(--muted);padding:0 var(--s-1)}
.why{display:block;color:var(--muted);font-size:13px;line-height:20px}
.type{font:500 11px/16px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-right:var(--s-2)}
.pager{display:flex;justify-content:space-between;align-items:center;margin:var(--s-5) 0 0}
.empty,.removed{border:1px dashed var(--control);padding:var(--s-5);margin:var(--s-5) 0}.empty h2,.removed h1{margin-top:0;border:0;padding:0}
dl.facts{display:grid;grid-template-columns:max-content 1fr;gap:var(--s-2) var(--s-5);margin:0 0 var(--s-5)}dl.facts dt{color:var(--muted)}dl.facts dd{margin:0;overflow-wrap:anywhere}
ul.tree{list-style:none;margin:0;padding:0}ul.tree ul.tree{margin-left:var(--s-5);border-left:1px solid var(--rule);padding-left:var(--s-4)}ul.tree li{padding:var(--s-2) 0}
.count{font:500 13px var(--f-mono);color:var(--muted);margin-left:var(--s-2)}
@media (max-width:480px){.files td[data-label]::before{content:attr(data-label);display:block;font:500 11px/16px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
form.filters{grid-template-columns:1fr}.pager .btn{width:auto}}
`;
