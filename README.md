# PipeTube

A YouTube front-end built on the [Piped](https://piped.video) API with automatic
[Invidious](https://invidious.io) fallback. No account, no tracking, no ads. The
whole app is a static build, so it can be hosted anywhere.

## Features

- Trending, category browsing, and search with type-ahead suggestions
- Watch page with HLS + progressive MP4 playback, quality and subtitle menus
- Channel pages with Videos / Playlists / About tabs
- Playlist playback
- Related videos, comments, and watch history (stored locally)
- Dark, light, and system themes
- Responsive grid with list view and infinite scroll
- Configurable instances, including your own custom instances

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints, usually <http://localhost:5173>.

To build a production bundle in `dist/`:

```bash
npm run build
npm run preview
```

## How instances work

PipeTube talks to Piped and Invidious through one internal interface, so it does
not matter which one ends up serving a request. Open **Settings** to pick an
instance, pin a provider, or add a custom instance URL.

Failover walks a chain of instances and uses the first one that answers:

1. The instance you selected.
2. Instances from the *other* provider. Public instances of one provider tend
   to share upstream breakage, so this is usually a fast win.
3. Remaining instances of your own provider.

Requests fail over on network errors, HTTP 429, and HTTP 5xx. A 404 from your
selected instance is treated as authoritative (the content really is gone), while
a 404 from a fallback instance just means that instance cannot serve it, so the
chain continues.

Some endpoints are only implemented by one provider, and instances are
sometimes degraded. When an instance answers with an unusable payload, such as a
stream list with no usable URLs, PipeTube treats it as a failure and moves on:

| Feature | Piped | Invidious |
| --- | --- | --- |
| Trending, search | yes | yes |
| Video streams | yes | yes |
| Subtitles | yes | yes |
| Comments | yes | often disabled |
| Channel videos | varies by instance | yes |
| Channel playlists | not supported | yes |
| Playlist videos | varies by instance | yes |

Set the provider to **Piped** or **Invidious** in Settings to disable
cross-provider failover.

## Custom instances

Any Piped or Invidious API base URL works. Add it in **Settings > Instances**;
PipeTube guesses the provider from the URL and remembers it in
`localStorage`. To deploy your own backend, point it at a healthy
[Piped](https://github.com/wiki/TeamPiped/Piped-Frontend) or
[Invidious](https://docs.invidious.io/installation/) instance.

If media will not play, the usual cause is CORS. Instances that stream directly
from Google's CDN need permissive CORS headers, which not all of them send.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint |
| `npm run smoke` | Exercise both API adapters against live instances |

`npm run smoke` makes real network calls and prints a pass/fail report for
trending, search, video, comments, channel, and playlist endpoints across the
Piped and Invidious adapters. It is the quickest way to tell whether a given
instance is currently healthy.

## Project layout

```
src/
  api/          Provider adapters, instance registry, failover
  components/   Player, cards, search bar, layout, shared UI
  hooks/        Async data and pagination helpers
  pages/        One component per route
  state/        Settings context and watch history
  styles/       Global theme and component styles
scripts/
  smoke.ts      Live API smoke test
```

## Tech stack

React 19, React Router 7, TypeScript, Vite 8, hls.js, Oxlint. No UI framework
and no CSS-in-JS; styling lives in `src/styles/`.

## Notes

- Settings and watch history live in `localStorage` and never leave the browser.
- There is no backend of its own. All requests go straight from the browser to
  the selected instance, which is why CORS matters.
- Media URLs from these APIs are short-lived and signed by Google, so they can
  expire while a page is open. Reloading the watch page fetches fresh ones."# youtube" 
