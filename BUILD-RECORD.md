# Build record: SB quote journey in Harbourline (build 4)

Branch `mark/build-4`, cut from `master`. Started 10:51:22, done 11:00:45 BST (≈9.5 min, verification included).

## What was built

- `/quote`: one tile per product from `client.listVerticals()`. A tile clears the stored journey, then navigates. Also embedded in the home page's `#quote-app` slot.
- `/quote/$vertical`: the full journey. Sections → quotes (with detail) → agreements → handoff (`location.assign`).
- `src/lib/sdk.ts`: a lazy, browser-only client (`baseUrl: location.origin`) and `storageKey`.
- `src/components/quote/*`: session hook (docs React recipe), `Journey` switch on `screen.kind`, `FieldControl` switch on `field.kind`, trade search, quotes and detail.
- `vite.config.ts`: added the `/trade_search` proxy. Master only proxied `/api`.
- shadcn: input, label, checkbox, radio-group, alert.

Verified in headless Chromium against localhost:3000:
- cyber: 4 sections → 1 quote (USG, $250) → detail → agreements (required error shown when unticked) → handoff URL.
- usa: 12 sections, with a reload partway through (resumed correctly) → 11 cards (4 choosable, 7 declined) → agreements → handoff URL.
- `tsc` and `biome check` both clean. No console errors.

The repo's dev-tools filler (`window.__devTools.fill`) entered the answers during testing. Nothing in the app depends on it.

## Sources used

- `node_modules/@simplybusiness/sdk-core/{README.md,AGENTS.md,dist/llms.txt}`
- Docs site `llms-full.txt`: "React and server rendering", "Build a quote form", "Agreements".
- `dist/**/*.d.ts` (published type declarations) for the exact `Field`, `Screen` and `QuoteCard` shapes.
- **SDK source or tests: not read, and not available.** The installed package ships `dist` only, with no `src` or tests, so that line in the prompt is wrong for the installed package.

## Guesses and friction (for improving skills, tools and docs)

1. **Branch.** The working tree was on `build-3`, and the prompt said to read master only. I branched off master without reading build-3. Master already had a `/api` proxy and dev-tools.
2. **Client at module scope vs SSR.** The React recipe creates the client at module scope with a fixed `baseUrl`. The browser recipe uses `location.origin`, which doesn't exist on the server. Neither page combines the two for SSR plus a same-origin proxy. I guessed a lazy `getClient()`, called only from effects and handlers. *Docs gap.*
3. **"Get quotes" button: the docs contradict themselves.** Step 3 says `quoteButton.disabled = !screen.ready`. Step 7 says pressing it before the form is complete yields `missing`/`attention`, which can't happen while it's disabled. I kept it enabled. *Docs gap.*
4. **`attention` effect loop.** `toScreen` in `useMemo` returns new objects on every state change. An effect keyed on `screen.missing`/`screen.attention` would refocus on every keystroke, so I keyed it by primitives instead. The docs don't mention this. *Docs gap (React).*
5. **HTML labels and lint.** Labels, hints and option labels are HTML, so the app needs `dangerouslySetInnerHTML`. Biome flags it. The docs don't say whether this HTML is trusted or sanitised. I suppressed the rule for the field file. *Docs gap: state the trust model.*
6. **Implicit section title.** The server sends unplaced questions in cyber (customer address) and usa, so a trailing untitled section appears with `title: undefined`. I picked the fallback copy "Tell us about your business". *Guess.*
7. **Display value for an answered trade.** No helper turns a stored `values[name]` into a label, so the UI shows the raw `value`. *Possible SDK addition.*
8. **The premium breakdown doesn't add up.** USG shows net $150, tax $0, fees $0 and total $250. The gap is presumably commission, which the docs say never to show. I relabelled the row "Net premium". There's no guidance on presenting a breakdown with a hidden gap. *Docs gap.*
9. **The pinned section resets on reload.** It lives in React state, so a reload goes to the first incomplete section. Answers are restored. Acceptable, and not covered in the docs.
10. **shadcn CLI** generated `import { cn } from "cn"`. That matches the existing components, so I left it.
12. **Backend bug: the trade search doesn't match the trades the server accepts.** Found after a user report. Both cyber and usa point `Primary trade.search` at `/api/v0/trades`, which returns values like "Accountant" and "Book keeper". The same server's `one_of` list (453 values, sent only in the error) accepts "Accounting" and "Bookkeeping" instead. Of 7 common searches, only "photograph" returned an accepted value. A rejected trade showed the SDK's generic `choice` copy ("Please select one of the options") under a trade that looked picked. UI fix: a server-rejected trade reopens the search, and `fieldState(..., { messages })` overrides the copy for search fields. *The API needs fixing. The docs also say cyber uses `/trade_search`, but this server sends `/api/v0/trades` for both products.*
11. **Proxy.** The docs said to proxy `/trade_search`. Master's config lacked it, so cyber trade search would have failed without the fix. *Docs covered it; the base repo didn't.*

## Did the docs cover the prompt? What must stay

| Prompt line | Covered by SDK/docs? | Keep? |
|---|---|---|
| API sends no CORS headers | Yes: AGENTS.md and the docs give the Vite proxy recipe, with both paths | Remove |
| No auth locally | Mostly: the docs say no key for the mock, and never ship a key to the browser | Remove (or shorten) |
| Private registry | Yes: README/AGENTS `.npmrc` (`bunfig.toml` already set) | Remove |
| Docs site URL | Partly: AGENTS links "`/learn/react/` in the SDK docs" without a host | **Keep** |
| Backend already on :3000, no mock-api | No: the docs tell you to start mock-api | **Keep** |
| cyber and usa produce quotes | No | **Keep** (needed to test; the app still lists every product, as the docs require) |
| "Source code includes SDK source and tests" | Not true: the package ships dist only | Fix or remove |
| Stack (TanStack Start, bun, shadcn, tailwind) | n/a (project) | Keep |
| Run on a port other than 3000 | Already `--port 4000` in `package.json` | Removable |
| Launch journeys in a new route | Docs recommend `/quote/$vertical`-style tiles → route | Removable (docs push you there) |
| Tasks 2–4 (record, docs audit, clock) | n/a | Keep |
