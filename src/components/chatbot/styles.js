// The widget lives in a Shadow DOM, so the portal's own CSS cannot break it and it cannot break the portal.
export const STYLES = `
:host { all: initial; font-family: system-ui, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Tamil", "Nirmala UI", "Latha", sans-serif;
  --brand: #0b6e99; --brand-dark: #08536f; --bg: #ffffff; --fg: #1b1f24; --muted: #5b6672; --border: #d5dbe1;
  --user-bg: #0b6e99; --user-fg: #ffffff; --bot-bg: #eef2f6; --err-bg: #fdecea; --err-fg: #8a1c14; --focus: #ffb000; }
@media (prefers-color-scheme: dark) {
  :host { --bg: #1c2229; --fg: #eef1f4; --muted: #a9b3be; --border: #3a444f; --bot-bg: #2a323b; --err-bg: #4a1f1c; --err-fg: #ffd5d0; --user-bg: #1b7ea8; }
}
*, *::before, *::after { box-sizing: border-box; }
[hidden] { display: none !important; }
.root { position: fixed; bottom: 16px; z-index: 2147483000; color: var(--fg); }
.root.right { right: 16px; } .root.left { left: 16px; }
button { font: inherit; cursor: pointer; }
button:focus-visible, textarea:focus-visible, a:focus-visible, summary:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
.launcher { width: 56px; height: 56px; border-radius: 50%; border: 0; background: var(--brand); color: #fff; display: grid; place-items: center;
  box-shadow: 0 4px 14px rgba(0,0,0,.3); }
.launcher:hover { background: var(--brand-dark); }
.launcher svg { width: 28px; height: 28px; fill: currentColor; }
.panel { position: absolute; bottom: 68px; width: min(380px, calc(100vw - 32px)); height: min(560px, calc(100vh - 110px)); display: flex; flex-direction: column;
  background: var(--bg); border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 10px 34px rgba(0,0,0,.28); overflow: hidden; }
.root.right .panel { right: 0; } .root.left .panel { left: 0; }
header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--brand); color: #fff; }
header h2 { margin: 0; font-size: 1rem; font-weight: 600; }
.close { background: transparent; border: 0; color: #fff; font-size: 1.5rem; line-height: 1; padding: 2px 8px; border-radius: 6px; }
.close:hover { background: rgba(255,255,255,.18); }
.disclaimer { margin: 0; padding: 8px 12px; font-size: .78rem; color: var(--muted); border-bottom: 1px solid var(--border); }
.log { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; scroll-behavior: smooth; }
.msg { max-width: 88%; padding: 8px 12px; border-radius: 12px; font-size: .94rem; line-height: 1.45; overflow-wrap: anywhere; }
.msg p { margin: 0; white-space: pre-wrap; }
.booking-link { display: inline-block; margin-top: 10px; padding: 8px 12px; border-radius: 6px; background: var(--brand); color: #fff; text-decoration: none; font-weight: 600; }
.booking-link:hover { background: var(--brand-dark); }
.msg.user { align-self: flex-end; background: var(--user-bg); color: var(--user-fg); border-bottom-right-radius: 4px; }
.msg.bot { align-self: flex-start; background: var(--bot-bg); border-bottom-left-radius: 4px; }
.msg.error { align-self: flex-start; background: var(--err-bg); color: var(--err-fg); border-bottom-left-radius: 4px; }
.msg[lang="ta"] { line-height: 1.7; font-size: 1rem; }
.who { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.sources { margin-top: 6px !important; font-size: .78rem; color: var(--muted); }
.sources a { color: inherit; text-decoration: underline; }
.retry { margin-top: 8px; padding: 4px 12px; border-radius: 8px; border: 1px solid currentColor; background: transparent; color: inherit; }
.typing { display: flex; gap: 4px; align-items: center; min-height: 34px; }
.typing i { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); animation: blink 1.2s infinite ease-in-out; }
.typing i:nth-child(2) { animation-delay: .2s; } .typing i:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .typing i { animation: none; opacity: .7; } .log { scroll-behavior: auto; } }
.chips { border-top: 1px solid var(--border); padding: 6px 12px; font-size: .85rem; }
.chips summary { cursor: pointer; color: var(--muted); padding: 2px 0; }
.chip-group { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.chip { border: 1px solid var(--brand); color: var(--brand); background: transparent; border-radius: 999px; padding: 4px 12px; font-size: .84rem; }
.chip:hover:not(:disabled) { background: var(--brand); color: #fff; }
.chip:disabled { opacity: .5; cursor: not-allowed; }
.chip[lang="ta"] { font-size: .9rem; }
.status { min-height: 0; padding: 0 12px; font-size: .8rem; color: var(--muted); }
.status p { margin: 4px 0; }
.status .input-error { color: var(--err-fg); }
form { display: flex; align-items: flex-end; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--border); position: relative; }
textarea { flex: 1; resize: none; max-height: 120px; min-height: 40px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 10px;
  font: inherit; background: var(--bg); color: var(--fg); }
.send { padding: 9px 14px; border: 0; border-radius: 10px; background: var(--brand); color: #fff; font-weight: 600; }
.send:disabled { background: var(--border); color: var(--muted); cursor: not-allowed; }
.counter { position: absolute; right: 94px; top: -16px; font-size: .72rem; color: var(--muted); }
.counter.over { color: var(--err-fg); font-weight: 700; }
@media (max-width: 480px) { .root { bottom: 8px; } .root.right { right: 8px; } .root.left { left: 8px; }
  .panel { width: calc(100vw - 16px); height: min(75vh, 560px); } }
`;
