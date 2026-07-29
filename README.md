# Frontend Dashboard

A dark, instrument-panel-style trading dashboard (React + TypeScript + Tailwind v4)
covering all four panels from the original spec plus a live alert feed and the
Trading Control Center.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. On first load, click the gear icon (top-right)
and point **API base URL** at wherever your backend is running (defaults to
`http://localhost:8000`) -- this is stored in your browser's localStorage, not
baked into the build, so you can point the same deployed frontend at different
backends without rebuilding.

## What's here

- **Market Watchlist** -- live price/bias/regime per instrument + confluence score
- **Signal Dashboard** -- table of every recorded signal with stage/grade/result
- **AI Analysis** -- per-instrument bull/bear case, scenario, invalidation
- **Performance Dashboard** -- win rate, profit factor, breakdowns by instrument/grade
- **Trading Control Center** -- global/per-instrument mode switches, two-step
  auto-trading activation, emergency stop, audit log
- **Live Alert Feed** -- WebSocket connection to `/ws/alerts`, auto-reconnects

## Notes

- `npm run build` (runs `tsc -b && vite build`) and `npm run lint` (oxlint) both
  pass clean as of the last update to this scaffold.
- Backend routes expect instrument symbols as `EUR-USD` (dash-separated) in the
  URL path, not URL-encoded slashes -- `src/lib/api.ts` handles this conversion.
  If you add new endpoints that take an instrument in the path, follow the same
  convention (this was a real bug caught by testing against a live backend,
  not something to reintroduce).
- No screenshot/visual QA has been done from the assistant side -- this was built
  and verified against a live backend (every API call's response shape was
  checked against the TypeScript types in `src/types/api.ts`), but nobody has
  actually looked at it rendered in a browser yet. Worth a first-look pass for
  spacing/contrast/responsive behavior before considering this "done."
