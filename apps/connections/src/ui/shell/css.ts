/** App styles on top of the design-system tokens and base rules. */
export const appCss = `:root{--ground:#F7F5EF}html body{background:var(--ground)}.app h1{font:400 36px/42px var(--f-serif);letter-spacing:-.01em}h2 .count{font:500 12px/16px var(--f-mono);color:var(--muted);margin-left:var(--s-2)}
.app{display:grid;grid-template-columns:208px minmax(0,1fr);min-height:100vh}
.rail{border-right:1px solid var(--rule);padding:var(--s-5) var(--s-4);display:flex;flex-direction:column;gap:var(--s-1)}
.rail .mark{font:600 15px/22px var(--f-display);margin:0 0 var(--s-5)}
.rail a,.rail span{font-size:14px;line-height:20px;padding:var(--s-2) var(--s-3);color:var(--ink);text-decoration:none;display:flex;justify-content:space-between}
.rail a[aria-current=page]{box-shadow:inset 2px 0 var(--accent);font-weight:600}.rail a:hover{background:var(--paper-3)}
.rail span{color:var(--muted)}.rail span small{font:500 11px/20px var(--f-mono);letter-spacing:.14em;text-transform:uppercase}
.top{display:flex;justify-content:flex-end;align-items:center;gap:var(--s-4);padding:var(--s-3) var(--s-5);border-bottom:1px solid var(--rule);font-size:13px;color:var(--muted)}
.top form{max-width:none;margin:0}.top .btn{min-height:32px;padding:0 var(--s-3);font-size:13px}
.app main{margin:0;max-width:1000px}.app h1{margin-bottom:var(--s-3)}.app .lede{color:var(--muted);margin:0 0 var(--s-5);max-width:60ch}
.st{display:inline-flex;align-items:center;gap:6px;font-size:14px}.st::before{content:"";width:8px;height:8px;border-radius:50%;background:currentColor;flex:none}
.st.ok{color:var(--ok)}.st.warn{color:var(--warn)}.st.off{color:var(--muted)}.st.busy{color:var(--accent-ink)}.st.busy::before{animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{50%{opacity:.25}}
.app .table td{font-size:14px;padding:10px var(--s-4) 10px 0}.app .table .num{text-align:right;font-variant-numeric:tabular-nums}
.app .table td a{font-weight:500}.app .table .why{display:block;font-size:13px;color:var(--muted)}
.dir{list-style:none;margin:0 0 var(--s-5);padding:0}.dir li{display:flex;align-items:baseline;gap:var(--s-4);padding:10px 0;border-bottom:1px solid var(--rule);font-size:14px}
.dir .name{flex:0 0 200px;font-weight:500}.dir .why{flex:1;color:var(--muted);font-size:13px}.dir .go{margin-left:auto;min-height:32px;padding:0 var(--s-4);font-size:13px}
.empty{padding:var(--s-3) 0 var(--s-6)}.empty p{margin:0 0 var(--s-3)}
.strip{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink);border-bottom:1px solid var(--rule);margin:var(--s-5) 0}
.strip div{padding:var(--s-3) var(--s-4) var(--s-3) 0}.strip dt{font:500 11px/16px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.strip dd{margin:var(--s-1) 0 0;font-size:14px}.strip .big{font-size:22px;line-height:28px;font-variant-numeric:tabular-nums}
.acts{display:flex;flex-wrap:wrap;gap:var(--s-4);align-items:flex-start}.acts form{margin:0}form.acts{align-items:center;max-width:none}
.confirm{border:1px solid var(--warn);padding:var(--s-3) var(--s-4);max-width:420px}.confirm summary{cursor:pointer;color:var(--warn);font-weight:500}
.confirm p{margin:var(--s-3) 0}.scopes{padding:0 0 0 var(--s-5);margin:0 0 var(--s-5)}.scopes li{padding:2px 0}code{font:400 13px/20px var(--f-mono);word-break:break-all}
.app .field{max-width:420px}form.clear{margin-top:var(--s-3)}
@media (max-width:720px){.app{grid-template-columns:1fr}.rail{flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid var(--rule);padding:var(--s-3) var(--s-4);align-items:center}
.rail .mark{margin:0 var(--s-4) 0 0}.top{padding:var(--s-2) var(--s-4)}.dir li{flex-wrap:wrap;gap:var(--s-1) var(--s-4)}.dir .name{flex-basis:100%}.strip{grid-template-columns:1fr}}
@media (max-width:480px){.dir .go{width:auto}.app .table td[data-label]::before{content:attr(data-label);display:block;font:500 11px/16px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}}`;
