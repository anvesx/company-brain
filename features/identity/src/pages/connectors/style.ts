/** The tile grid: two columns from 40rem up, one below. Dark card surface, a plus button, a green check once linked. */
export const GRID_STYLE = `<style>
.tiles{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;gap:1rem}
@media(min-width:40rem){.tiles{grid-template-columns:1fr 1fr}}
.tile{display:flex;gap:1rem;align-items:flex-start;padding:1rem;border-radius:.75rem;background:#262626;color:#e7e5e4}
.tile[aria-disabled=true]{opacity:.55}
.logo{flex:none;width:3rem;height:3rem;border:1px solid #3f3f3f;border-radius:.5rem;display:grid;place-items:center}
.tile .text{flex:1;min-width:0}.tile strong{font-size:1.05rem}
.tile p{margin:.25rem 0;color:#a8a29e}.tile .by{font-size:.9rem}
.tile form{margin:0}.tile a{color:#86efac}
.plus,.ok{flex:none;width:2.25rem;height:2.25rem;border-radius:.5rem;display:grid;place-items:center;font-size:1.4rem;line-height:1}
.plus{border:0;background:#404040;color:#fff;padding:0}
.ok{background:#1f3a24;color:#4ade80}
</style>`;
