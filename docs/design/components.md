# Components

Paste after the `:root` block in `STYLE`. Containers are square, flat, hairline-bordered. Responsive and motion CSS is in `system.md`; append it last.

## Base, layout and focus

```css
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
```

## Button

`btn` primary (one per view), `btn btn-2` secondary, `btn btn-danger` destructive, `btn btn-link` inline.

```css
.btn{font:500 15px/22px var(--f-display);padding:var(--s-2) var(--s-4);min-height:40px;border:1px solid var(--ink);border-radius:0;background:var(--ink);color:var(--paper);cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:var(--s-2)}
.btn:hover{background:var(--accent-ink);border-color:var(--accent-ink)}
.btn-2{background:var(--paper);color:var(--ink);border-color:var(--control)}.btn-2:hover{background:var(--paper-3);border-color:var(--ink)}
.btn-danger{background:var(--paper);color:var(--warn);border-color:var(--warn)}.btn-danger:hover{background:var(--warn);border-color:var(--warn);color:var(--paper)}
.btn-link{background:none;border:0;padding:0;min-height:0;color:var(--accent-ink);text-decoration:underline}.btn-link:hover{background:none;color:var(--ink)}
.btn:disabled,.btn[aria-disabled=true]{background:var(--paper-3);border-color:var(--rule);color:var(--muted);cursor:not-allowed}
```

## Provider button

Google's rules come from the [branding guidelines](https://developers.google.com/identity/branding-guidelines), checked on 6 Nov 2026. The label is "Continue with Google". The four-colour G is unaltered. The fill is white with a 1px `#747775` stroke. The text is `#1F1F1F` Google Sans Medium 14/20. Padding is 12px left of the G, 10px after it and 12px after the text. "Rectangular" is one of the two listed shapes, so square corners are allowed. The button must be as prominent as other sign-in buttons. The page sets no height, so 40px is our choice.

```css
.btn-google{font:500 14px/20px var(--f-google);height:40px;min-height:40px;padding:0 var(--s-3);gap:10px;width:100%;background:#FFF;color:#1F1F1F;border:1px solid #747775}
.btn-google:hover{background:#F1F1F1;border-color:#747775}.btn-google svg{width:20px;height:20px;flex:none}.btn-google:disabled{background:#FFF;opacity:.38}
```

```html
<button class="btn btn-google" type="submit"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google</button>
```

## Tile and chip

A tile is one `<form class="tile">` (the POST of connector-accounts rule 1) with one button. Modifiers `.needs-auth`, `.off`. Chip text: "Active", "Needs sign in", "Not configured", "Not linked".

```css
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--s-4)}
.tile{border:1px solid var(--rule);padding:var(--s-4);display:flex;flex-direction:column;gap:var(--s-3);max-width:none}.tile:hover{border-color:var(--ink)}.tile p{margin:0}.tile .btn{margin-top:auto;width:100%}
.tile-head{display:flex;align-items:center;gap:var(--s-3)}.tile-mark{width:36px;height:36px;border:1px solid var(--ink);display:grid;place-items:center;font:500 13px var(--f-mono)}.tile-mark svg{width:20px;height:20px}
.tile.needs-auth{border-left:2px solid var(--warn)}.tile.off{border:1px dashed var(--control);color:var(--muted)}.tile.off:hover{border-color:var(--control)}
.chip{font:500 11px/16px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;padding:2px var(--s-2);border:1px solid currentColor;border-radius:0;margin-left:auto;white-space:nowrap}
.chip.ok{color:var(--ok)}.chip.warn{color:var(--warn)}.chip.off{color:var(--muted);border-style:dashed}
```

## Form field and inline error

On error set `aria-invalid="true"` and `aria-describedby` to the error's `id`.

```css
form{max-width:420px}.field{margin:0 0 var(--s-4)}.field label{display:block;font-weight:500;margin:0 0 var(--s-1)}
.field input{width:100%;font:inherit;padding:var(--s-2) var(--s-3);min-height:40px;border:1px solid var(--control);border-radius:0;background:var(--paper);color:var(--ink)}
.field input:focus-visible{border-color:var(--ink)}.field input[aria-invalid=true]{border-color:var(--warn)}
.field-error{font-size:13px;line-height:20px;color:var(--warn);margin:var(--s-1) 0 0}
```

## Flash message and table

Flash: `role="alert"` for errors, `role="status"` for success. Table: real `<table>`, `<th scope>`, no zebra.

```css
.flash{padding:var(--s-3) var(--s-4);border-left:2px solid var(--ok);background:var(--paper-2);margin:0 0 var(--s-5)}.flash.bad{border-left-color:var(--warn)}
.table{width:100%;border-collapse:collapse}.table th{font:500 11px/16px var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);text-align:left;padding:var(--s-2) var(--s-4) var(--s-2) 0;border-bottom:1px solid var(--ink)}
.table td{padding:var(--s-3) var(--s-4) var(--s-3) 0;border-bottom:1px solid var(--rule);vertical-align:middle}.table td:last-child,.table th:last-child{text-align:right;padding-right:0}
```
