/**
 * Complete CSS styles for the design system.
 */

import { darkTokens, lightTokens } from "../tokens/css.ts";

export const styles = `${lightTokens()}${darkTokens()}
*{box-sizing:border-box}
body{margin:0;font:400 15px/22px var(--f-display);color:var(--ink);background:var(--paper);-webkit-font-smoothing:antialiased;font-feature-settings:"tnum"}
main{max-width:720px;margin:0 auto;padding:var(--s-6) var(--s-5) var(--s-8)}main.wide{max-width:960px}
h1{font:500 32px/36px var(--f-display);letter-spacing:-.02em;margin:0 0 var(--s-5)}h1 em{font:italic 400 1em var(--f-serif);color:var(--accent-ink)}
h2{font:600 17px/24px var(--f-display);margin:var(--s-6) 0 var(--s-4);padding-top:var(--s-3);border-top:1px solid var(--ink)}h3{font:600 15px/22px var(--f-display);margin:0}
a{color:var(--accent-ink)}small,.hint{font-size:13px;line-height:20px;color:var(--muted)}
.eyebrow{font:500 11px/16px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.skip{position:absolute;left:-9999px}.skip:focus{left:var(--s-4);top:var(--s-4);background:var(--paper);padding:var(--s-2) var(--s-3);z-index:10}
pre{font:400 13px/20px var(--f-mono);background:var(--paper-3);padding:var(--s-4);overflow:auto;margin:var(--s-3) 0}
.btn{font:500 15px/22px var(--f-display);padding:var(--s-2) var(--s-4);min-height:40px;border:1px solid var(--ink);border-radius:0;background:var(--ink);color:var(--paper);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:var(--s-2)}
.btn:hover{background:var(--accent-ink);border-color:var(--accent-ink)}
.btn-2{background:var(--paper);color:var(--ink);border-color:var(--control)}.btn-2:hover{background:var(--paper-3);border-color:var(--ink)}
.btn-danger{background:var(--paper);color:var(--warn);border-color:var(--warn)}.btn-danger:hover{background:var(--warn);border-color:var(--warn);color:var(--paper)}
.btn-link{background:none;border:0;padding:0;min-height:0;color:var(--accent-ink);text-decoration:underline}.btn-link:hover{background:none;color:var(--ink)}
.btn:disabled,.btn[aria-disabled=true]{background:var(--paper-3);border-color:var(--rule);color:var(--muted);cursor:not-allowed}
.btn-google{font:500 14px/20px var(--f-google);height:40px;min-height:40px;padding:0 var(--s-3);gap:10px;width:100%;background:#FFF;color:#1F1F1F;border:1px solid #747775}
.btn-google:hover{background:#F1F1F1;border-color:#747775}.btn-google svg{width:20px;height:20px;flex:none}.btn-google:disabled{background:#FFF;opacity:.38}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--s-4)}
.tile{border:1px solid var(--rule);padding:var(--s-4);display:flex;flex-direction:column;gap:var(--s-3);max-width:none}.tile:hover{border-color:var(--ink)}.tile p{margin:0}.tile .btn{margin-top:auto;width:100%}
.tile-head{display:flex;align-items:center;gap:var(--s-3)}.tile-mark{width:36px;height:36px;border:1px solid var(--ink);display:grid;place-items:center;font:500 13px var(--f-mono)}.tile-mark svg{width:20px;height:20px}
.tile.needs-auth{border-left:2px solid var(--warn)}.tile.off{border:1px dashed var(--control);color:var(--muted)}.tile.off:hover{border-color:var(--control)}
.chip{font:500 11px/16px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;padding:2px var(--s-2);border:1px solid currentColor;border-radius:0;margin-left:auto;white-space:nowrap}
.chip.ok{color:var(--ok)}.chip.warn{color:var(--warn)}.chip.off{color:var(--muted);border-style:dashed}
form{max-width:420px}.field{margin:0 0 var(--s-4)}.field label{display:block;font-weight:500;margin:0 0 var(--s-1)}
.field input{width:100%;font:inherit;padding:var(--s-2) var(--s-3);min-height:40px;border:1px solid var(--control);border-radius:0;background:var(--paper);color:var(--ink)}
.field input:focus-visible{border-color:var(--ink)}.field input[aria-invalid=true]{border-color:var(--warn)}
.field-error{font-size:13px;line-height:20px;color:var(--warn);margin:var(--s-1) 0 0}
.flash{padding:var(--s-3) var(--s-4);border-left:2px solid var(--ok);background:var(--paper-2);margin:0 0 var(--s-5)}.flash.bad{border-left-color:var(--warn)}
.table{width:100%;border-collapse:collapse}.table th{font:500 11px/16px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);text-align:left;padding:var(--s-2) var(--s-4) var(--s-2) 0;border-bottom:1px solid var(--ink)}
.table td{padding:var(--s-3) var(--s-4) var(--s-3) 0;border-bottom:1px solid var(--rule);vertical-align:middle}.table td:last-child,.table th:last-child{text-align:right;padding-right:0}
@media (max-width:480px){main{padding:var(--s-5) var(--s-4) var(--s-7)}h1{font-size:24px;line-height:28px}.tiles{grid-template-columns:1fr}form{max-width:none}.field input{font-size:16px}.btn{width:100%}
.table thead{position:absolute;left:-9999px}.table tr{display:block;border-bottom:1px solid var(--rule);padding:var(--s-3) 0}.table td{display:block;border:0;padding:var(--s-1) 0;text-align:left!important}}
@media (pointer:coarse){.btn,.field input{min-height:44px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important}}`;
