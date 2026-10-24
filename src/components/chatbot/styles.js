// The widget lives in a Shadow DOM, so the portal's own CSS (including Tailwind) cannot reach it,
// and it cannot break the portal. These styles therefore use Tailwind's own values (colours, spacing,
// radii, shadows) written as plain CSS, so the widget matches the rest of the site.
//
// Tailwind reference used below:
//   blue-600 #2563eb  blue-700 #1d4ed8  blue-800 #1e40af
//   emerald-700 #047857  emerald-800 #065f46
//   slate-50 #f8fafc  slate-100 #f1f5f9  slate-200 #e2e8f0  slate-300 #cbd5e1
//   slate-400 #94a3b8  slate-600 #475569  slate-900 #0f172a
//   red-50 #fef2f2  red-200 #fecaca  red-800 #991b1b
export const STYLES = `
:host {
  all: initial;
  font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Tamil", "Nirmala UI", "Latha", sans-serif;
  --brand: #1d4ed8; --brand-dark: #1e40af; --accent: #047857; --accent-dark: #065f46;
  --bg: #ffffff; --fg: #0f172a; --muted: #475569; --border: #e2e8f0; --border-strong: #cbd5e1;
  --user-bg: #1d4ed8; --user-fg: #ffffff; --bot-bg: #f1f5f9;
  --err-bg: #fef2f2; --err-border: #fecaca; --err-fg: #991b1b; --focus: #2563eb;
}
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
.root { position: fixed; bottom: 16px; z-index: 2147483000; color: var(--fg); }
.root.right { right: 16px; } .root.left { left: 16px; }
button { font: inherit; cursor: pointer; }
button:focus-visible, textarea:focus-visible, a:focus-visible, summary:focus-visible {
  outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 8px;
}

/* Launcher */
.launcher {
  width: 56px; height: 56px; border-radius: 9999px; border: 0; background: var(--brand); color: #fff;
  display: grid; place-items: center; transition: background-color .15s, transform .1s;
  box-shadow: 0 10px 15px -3px rgba(29,78,216,.3), 0 4px 6px -4px rgba(29,78,216,.3);
}
.launcher:hover { background: var(--brand-dark); }
.launcher:active { transform: scale(.95); }
.launcher svg { width: 28px; height: 28px; fill: currentColor; }

/* Panel */
.panel {
  position: absolute; bottom: 68px; width: min(400px, calc(100vw - 32px)); height: min(580px, calc(100vh - 110px));
  display: flex; flex-direction: column; background: var(--bg); border: 1px solid var(--border);
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(15,23,42,.25);
}
.root.right .panel { right: 0; } .root.left .panel { left: 0; }
header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--brand); color: #fff; }
header h2 { margin: 0; font-size: 1.0625rem; font-weight: 700; }
.close { background: transparent; border: 0; color: #fff; font-size: 1.5rem; line-height: 1; padding: 2px 10px; border-radius: 8px; }
.close:hover { background: rgba(255,255,255,.18); }
.close:focus-visible { outline-color: #fff; }
.disclaimer { margin: 0; padding: 10px 16px; font-size: .875rem; line-height: 1.4; color: var(--muted); background: #f8fafc; border-bottom: 1px solid var(--border); }

/* Messages */
.log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth; }
.msg { max-width: 88%; padding: 10px 14px; border-radius: 12px; font-size: 1rem; line-height: 1.5; overflow-wrap: anywhere; }
.msg p { margin: 0; white-space: pre-wrap; }
.msg.user { align-self: flex-end; background: var(--user-bg); color: var(--user-fg); border-bottom-right-radius: 4px; }
.msg.bot { align-self: flex-start; background: var(--bot-bg); border-bottom-left-radius: 4px; }
.msg.error { align-self: flex-start; background: var(--err-bg); color: var(--err-fg); border: 1px solid var(--err-border); border-bottom-left-radius: 4px; }
.msg[lang="ta"] { line-height: 1.75; font-size: 1.0625rem; }
.who { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.sources { margin-top: 8px !important; font-size: .875rem; color: var(--muted); }
.sources a { color: var(--brand); text-decoration: underline; text-underline-offset: 2px; }
.booking-link {
  display: inline-flex; align-items: center; margin-top: 10px; padding: 8px 14px; border: 0; border-radius: 10px;
  background: var(--accent); color: #fff; font-size: .9375rem; font-weight: 600; transition: background-color .15s;
}
.booking-link:hover { background: var(--accent-dark); }
.retry {
  margin-top: 8px; padding: 6px 14px; border-radius: 8px; border: 1px solid currentColor;
  background: transparent; color: inherit; font-size: .875rem; font-weight: 600;
}
.retry:disabled { opacity: .5; cursor: not-allowed; }

/* Typing indicator */
.typing { display: flex; gap: 4px; align-items: center; min-height: 38px; }
.typing i { width: 8px; height: 8px; border-radius: 9999px; background: var(--muted); animation: blink 1.2s infinite ease-in-out; }
.typing i:nth-child(2) { animation-delay: .2s; } .typing i:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .typing i { animation: none; opacity: .7; } .log { scroll-behavior: auto; }
  .launcher, .booking-link { transition: none; } .launcher:active { transform: none; }
}

/* Suggestion chips */
.chips { border-top: 1px solid var(--border); padding: 8px 16px; font-size: .9375rem; }
.chips summary { cursor: pointer; color: var(--muted); font-weight: 500; padding: 2px 0; }
.chip-group { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.chip {
  max-width: 100%; overflow-wrap: anywhere; white-space: normal; border: 1px solid var(--border-strong); color: #334155;
  background: #fff; border-radius: 9999px; padding: 6px 14px; font-size: .9375rem; font-weight: 500; transition: border-color .15s, background-color .15s, color .15s;
}
.chip:hover:not(:disabled) { border-color: var(--brand); background: #eff6ff; color: var(--brand-dark); }
.chip:disabled { opacity: .5; cursor: not-allowed; }
.chip[lang="ta"] { font-size: 1rem; }

/* Status lines */
.status { min-height: 0; padding: 0 16px; font-size: .875rem; color: var(--muted); }
.status p { margin: 4px 0; }
.status .input-error { color: var(--err-fg); font-weight: 500; }

/* Composer */
form { display: flex; align-items: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border); position: relative; background: #fff; }
textarea {
  min-width: 0; flex: 1; resize: none; max-height: 120px; min-height: 44px; padding: 10px 12px;
  border: 1px solid var(--border-strong); border-radius: 12px; font: inherit; font-size: 1rem; background: var(--bg); color: var(--fg);
}
textarea::placeholder { color: #64748b; }
textarea:focus { border-color: var(--brand); }
.send {
  min-height: 44px; padding: 0 18px; border: 0; border-radius: 12px; background: var(--brand); color: #fff;
  font-size: 1rem; font-weight: 600; transition: background-color .15s;
}
.send:hover:not(:disabled) { background: var(--brand-dark); }
.send:disabled { background: var(--border); color: #64748b; cursor: not-allowed; }
.counter { position: absolute; right: 100px; top: -18px; font-size: .75rem; color: var(--muted); }
.counter.over { color: var(--err-fg); font-weight: 700; }

@media (max-width: 480px) {
  .root { bottom: 8px; } .root.right { right: 8px; } .root.left { left: 8px; }
  .panel { width: calc(100vw - 16px); height: min(78vh, 580px); }
}
`;