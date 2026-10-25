# Employee Explorer: Yehia Meets Maya

**Student:** Achraf Nazha
**Course:** TechTalks · Next.js · Assignment 03
**Branch:** `assignment-3-maya-interview`
**Next.js version:** 16.4.3 (App Router, Turbopack, Cache Components on, which is the `create-next-app@16` default)

A one-page dashboard at `/` built for Maya's practical interview challenge. It loads data for one fictional employee (JSONPlaceholder user `1`) in three different ways:

| Section | What it shows | Where the request runs |
| --- | --- | --- |
| **Employee profile** | Name, email, company name (`GET /users/1`) | On the server, in an async Server Component inside its own `<Suspense>` |
| **Recent posts preview** | Up to three post titles (`GET /posts?userId=1`) | On the server, in an async Server Component inside a focused `<Suspense>` boundary, with a deliberate 2-second delay |
| **Explore all posts** | Titles and bodies of all posts (`GET /posts?userId=1`) | In the browser, from a Client Component, only after the **Load posts** click |

Each section handles its own loading and errors, so a slow or failed request in one section never hides the others.

## Run it locally

You need Node.js 20.9 or newer.

```bash
git clone https://github.com/Acharfnazha/employee-explorer.git
cd employee-explorer
git switch assignment-3-maya-interview
npm install
npm run dev
```

Open http://localhost:3000. Other scripts: `npm run lint`, `npm run build`, `npm start`.

In development, the terminal prints every server-side `fetch` with its full URL (`logging.fetches.fullUrl` in `next.config.ts`). That shows which requests run on the server. Requests from the **Load posts** button appear in the browser's Network panel instead.

## Demo controls (testing simulations)

The client explorer has a **Demo scenario** selector. The choice applies to the next **Load posts** or **Retry** click only. It does not affect the two server sections.

| Scenario | How it is produced | Expected result |
| --- | --- | --- |
| Success | A real request to JSONPlaceholder | Posts appear |
| Slow | Waits 2 seconds, then makes the real request | Loading feedback, then posts |
| HTTP error | **Simulated:** `new Response(…, { status: 503 })` created in the browser | The friendly error and a Retry button appear |
| Empty | **Simulated:** `new Response("[]", { status: 200 })` created in the browser | "No posts found", with no error |

The two simulated responses go through the same `readJson()` response check and JSON parsing as real responses. They are simulations: JSONPlaceholder did not return the 503 shown in the HTTP error scenario.

**Recovery demo:** choose *HTTP error*, press **Load posts**, read the message, switch to *Success*, then press **Retry**.

## Artificial delay (learning simulation)

The recent-posts preview waits **2 seconds on purpose** (`PREVIEW_DEMO_DELAY_MS` in `src/components/recent-posts-preview.tsx`), so its Suspense fallback can be seen. It calls `await connection()` from `next/server` first, so the delay happens on every real request instead of once during prerendering. This delay is part of the submitted demo on purpose; real code would not wait.

## Project structure

```
src/
  app/page.tsx                       Page shell and the three sections, each with its own boundary
  components/employee-profile.tsx    Async Server Component: profile
  components/recent-posts-preview.tsx  Async Server Component: preview + its fallback
  components/posts-explorer.tsx      Client Component: click-to-load, 5 states, demo scenarios
  lib/api.ts                         ApiError class, shared readJson() response check, types, URLs
docs/
  INTERVIEW.md                       Initial predictions, then explanations after testing
  TESTING.md                         Expected vs actual results for every check
  evidence/                          Screenshots
```

## Limitations

- One fixed employee (ID 1). There's no employee selection, search, or routing beyond `/` (out of scope).
- JSONPlaceholder is a public test API. If it's down or blocked, the real Success and Slow scenarios and both server sections show their friendly error messages instead.
- The network-failure path (a `fetch` that rejects with a `TypeError`) is handled in code and was checked directly, but it has no demo button. See `docs/TESTING.md`.
- No automated tests. All checks were done by hand in the browser and recorded in `docs/TESTING.md`.
- Not deployed. It runs locally with `npm run dev` or `npm run build && npm start`.

## Documents

- [`docs/INTERVIEW.md`](docs/INTERVIEW.md): my predictions before coding, and my answers to Maya's questions after testing
- [`docs/TESTING.md`](docs/TESTING.md): the test checklist with expected result, actual result, and pass/fail, plus screenshots
