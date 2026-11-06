// Tokens from docs/design/tokens.md and system.md. The canvas is black in both colour schemes; the legend, search
// and panel use the light tokens by default and the dark graph tokens under prefers-color-scheme: dark.
export const STYLE = `
:root{--ink:#0A0A0A;--muted:#5C6066;--rule:#E5E5E5;--control:#8A8F96;--paper:#FFFFFF;--paper-3:#F4F4F1;--accent:#1E6FFF;--accent-ink:#1560E0;
--f-display:'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;--f-mono:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,monospace;
--s-1:4px;--s-2:8px;--s-3:12px;--s-4:16px;--s-5:24px;--s-6:32px;--ui-bg:var(--paper);--ui-text:var(--ink);--ui-muted:var(--muted);--ui-line:var(--rule);--ui-link:var(--accent-ink);--ui-control:var(--control)}
@media (prefers-color-scheme:dark){:root{--ui-bg:#0B0B0C;--ui-text:#EDEDED;--ui-muted:#9A9FA6;--ui-line:#2A2D31;--ui-link:#6BA3FF;--ui-control:#7A7F86;--accent:#FFF}}
*{box-sizing:border-box}
body{margin:0;background:#000;color:var(--ui-text);font:400 15px/22px var(--f-display);overflow:hidden;-webkit-font-smoothing:antialiased;font-feature-settings:"tnum"}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.skip,.sr{position:absolute;left:-9999px}.skip:focus{left:var(--s-4);top:var(--s-4);background:var(--ui-bg);color:var(--ui-text);padding:var(--s-2) var(--s-3);z-index:10}
header{position:fixed;inset:0 0 auto 0;height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 var(--s-5);background:var(--ui-bg);border-bottom:1px solid var(--ui-line);z-index:2}
header a{color:var(--ui-link)}
.search{position:relative;width:280px}.search input{width:100%;min-height:32px;font:inherit;padding:var(--s-1) var(--s-3);background:var(--ui-bg);color:var(--ui-text);border:1px solid var(--ui-control);border-radius:0}
#results{position:absolute;top:36px;left:0;right:0;margin:0;padding:0;list-style:none;background:var(--ui-bg);border:1px solid var(--ui-line);max-height:50vh;overflow:auto}#results:empty{display:none}
#graph{position:fixed;inset:48px 0 0 0}
nav,#panel{position:fixed;top:48px;bottom:0;background:var(--ui-bg);overflow:auto;padding:var(--s-4);z-index:1}
nav{left:0;width:240px;border-right:1px solid var(--ui-line)}#panel{right:0;width:320px;border-left:1px solid var(--ui-line)}#panel[hidden]{display:none}
h2{font:600 17px/24px var(--f-display);margin:0 0 var(--s-3)}ul{list-style:none;margin:0;padding:0}
nav button,#panel li button,#results button{display:flex;width:100%;align-items:center;gap:var(--s-2);min-height:32px;padding:var(--s-1) var(--s-2);font:inherit;text-align:left;color:var(--ui-text);background:none;border:0;cursor:pointer}
nav button:hover,#panel li button:hover,#results button:hover{background:var(--paper-3);color:var(--ink)}nav button[aria-pressed=false]{opacity:.4}
nav b{margin-left:auto;font:500 13px var(--f-mono)}.swatch{width:12px;height:12px;flex:none;border-radius:0;border:1px solid var(--ui-control)}
#close{float:right;font:inherit;color:var(--ui-link);background:none;border:0;cursor:pointer;text-decoration:underline}
.eyebrow{font:500 11px/16px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ui-muted);margin:0}
#status,#more{position:fixed;bottom:var(--s-4);left:50%;transform:translateX(-50%);margin:0;padding:var(--s-2) var(--s-4);background:var(--ui-bg);color:var(--ui-text);border:1px solid var(--ui-line);z-index:1;font:inherit}
#status:empty{display:none}#more{bottom:64px;cursor:pointer}#more[hidden]{display:none}
/* The library injects these as <style> elements, which the page's CSP (style-src 'self') blocks, so they live here. */
.float-tooltip-kap{position:absolute;width:max-content;max-width:max(50%,150px);padding:3px 5px;border-radius:3px;font:12px sans-serif;color:#eee;background:rgba(0,0,0,.6);pointer-events:none}
.scene-nav-info{position:absolute;bottom:5px;width:100%;text-align:center;color:slategrey;opacity:.7;font-size:10px;font-family:sans-serif;pointer-events:none;user-select:none}
.scene-container canvas:focus{outline:none}.scene-container .clickable{cursor:pointer}.scene-container .grabbable{cursor:grab}.scene-container .grabbable:active{cursor:grabbing}
.graph .scene-tooltip{font:12px/16px var(--f-mono);color:#EDEDED;background:rgba(0,0,0,.8);padding:var(--s-1) var(--s-2)}
@media (max-width:480px){header{padding:0 var(--s-4)}.search{width:60%}nav{width:100%;bottom:auto;max-height:30vh;border-right:0}#panel{top:auto;width:100%;height:50%;border-left:0;border-top:1px solid var(--ui-line)}input{font-size:16px}}
@media (pointer:coarse){button,input{min-height:44px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;
