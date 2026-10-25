# Testing evidence

**Environment:** Next.js 16.4.3 (Turbopack, Cache Components on), Windows 11, a Chromium-based browser and headless Microsoft Edge. Most checks used the dev server (`npm run dev`); the delay check was repeated on the production server (`npm run build && npm start`). Every row records what I actually observed. Nothing is marked as passed because it "should" pass.

**How I observed things:**
- **Server requests:** the dev terminal prints every server-side `fetch` (`logging.fetches.fullUrl` in `next.config.ts`).
- **Browser requests:** the browser's Network list (Resource Timing entries), checked before and after clicking.
- **Streaming timing:** I read the raw HTML response chunk by chunk and timed when each part arrived.
- **Screenshots:** in `docs/evidence/`.

## Checklist

| # | Check | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | **Server profile** | Name, email and company of employee 1 come from the API, fetched on the server | Showed **Leanne Graham**, **Sincere@april.biz**, **Romaguera-Crona**. The dev terminal logged `GET https://jsonplaceholder.typicode.com/users/1 200` ("auto no cache"). The browser's Network list had **0** requests to jsonplaceholder after the page loaded. | ✅ Pass |
| 2 | **Server preview** | Fallback appears during the 2-second delay; the page shell stays visible | Timing of one dev request: title and the preview fallback ("Loading the 3 latest posts… (2-second demo delay)") arrived at **113 ms**, the profile at **371 ms**, and the preview posts at **2205 ms**. Screenshot `02` was taken 1 s after opening the page: title, intro, profile and the client explorer are visible while only the preview shows its fallback. On the **production** server, two separate requests gave the same pattern (fallback at 96 / 89 ms, posts at 2135 / 2147 ms), so the delay runs on every request, not once at build time. | ✅ Pass |
| 3 | **Client idle** | No client posts request before the first click | After the page loaded and waited 3 s, the Network list had **0** jsonplaceholder requests. After one click it had exactly **1**: `https://jsonplaceholder.typicode.com/posts?userId=1`, initiator `fetch`. | ✅ Pass |
| 4 | **Client slow** | Loading feedback is visible; repeat clicks can't start duplicates | Scenario *Slow*, then 5 quick mouse clicks (first version, with a `disabled` button): at 300 ms and 1300 ms the button read "Loading posts…" and could not be used, and the status read "Loading posts from the browser…". Requests started during the wait: **0**. After it finished: **1** request in total and 10 posts. Re-tested after the focus fix (Issue 1) with the keyboard: Enter, then Enter ×3 during the wait. The button had `aria-disabled="true"` and kept focus, and there was still only **1** request in total. | ✅ Pass |
| 5 | **Client success** | Returned titles and bodies appear | Scenario *Success*: **10** posts, each with title and body. The first title was "sunt aut facere repellat provident occaecati excepturi optio reprehenderit". | ✅ Pass |
| 6 | **HTTP failure** | The shared response check creates and handles the custom error | Scenario *HTTP error*: a locally created `Response` with status 503 went through `readJson()`, which threw `ApiError`. The UI showed "Couldn't load the posts. The posts service is unavailable right now (HTTP 503). You can try again." and "Error type: ApiError (HTTP 503)", and the button changed to **Retry**. Network requests for this scenario: **0** (it is simulated, so JSONPlaceholder was not called). Screenshot `03`. | ✅ Pass |
| 7 | **Empty response** | Empty-state message, not treated as an error | Scenario *Empty*: a local `Response("[]", { status: 200 })` went through the same `readJson()`. The UI showed **"No posts found"**, with no alert or error text. Network requests: **0**. Screenshot `04`. | ✅ Pass |
| 8 | **Recovery** | Switching to Success and retrying shows posts and clears the error | From the HTTP-error state, I switched to *Success* and pressed **Retry**: 10 posts appeared, the alert disappeared, and the button changed to "Load posts again". | ✅ Pass |
| 9 | **Section independence** | A failed client request doesn't remove the profile or preview | With the client explorer showing the 503 error, the profile still showed Leanne Graham / Sincere@april.biz / Romaguera-Crona and the preview still listed its 3 titles (screenshot `03` shows the preview above the error). | ✅ Pass |
| 10 | **Usability** | Labelled controls, visible keyboard focus, readable at about 360px | At **360 px** wide: `scrollWidth` = 360 (no horizontal scroll), body text 16px, the select and the button are both 44px tall. The select has a `<label>`: "Demo scenario (testing simulation)". Tab moves to the select, then the button, each with a solid indigo focus outline. Enter on the button loads posts. (Space wasn't tested separately.) Focus now stays on the button while loading (see Issue 1). All text colours pass WCAG AA; the lowest is 4.76:1 (white on the grey loading button, and the small grey labels). Screenshot `05`. | ✅ Pass (after the fix below) |

**Commands:**

| Command | Actual outcome |
| --- | --- |
| `npm run lint` | No errors or warnings |
| `npx tsc --noEmit` | No errors |
| `npm run build` | Succeeded. `/` was built as **◐ Partial Prerender** ("prerendered as static HTML with dynamic server-streamed content"). |

## Extra checks (beyond the list)

| Check | What I did | What happened |
| --- | --- | --- |
| Network failure vs HTTP failure | In the browser console I fetched an address that doesn't exist (`https://employee-api.invalid/users/1`), and a real missing record (`https://jsonplaceholder.typicode.com/users/9999`) | The bad address **rejected** with `TypeError: Failed to fetch` and gave no Response. The missing record **resolved** with `ok: false`, `status: 404`; `fetch` did not throw. |
| Employee ID 2 | Temporarily set `EMPLOYEE_ID = 2`, then reverted it | All three sections followed: profile **Ervin Howell / Shanna@melissa.tv / Deckow-Crist**, labels changed to `/users/2` and `/posts?userId=2`, the preview showed "Et ea vero quia laudantium autem…", and the client request went to `posts?userId=2`. |
| An employee that doesn't exist | Temporarily set `EMPLOYEE_ID = 9999`, then reverted it | **Real** server-side failure: the terminal logged `GET …/users/9999 404`, and the profile showed "We couldn't find the employee profile. The rest of the dashboard still works." The real API returned an empty list for `posts?userId=9999`: the preview said "This employee has no posts yet" and the client said "No posts found". The rest of the page rendered normally. |
| Profile without its own Suspense boundary | Temporarily removed the profile's `<Suspense>`, ran `npm run build`, then reverted | The build **failed**: "Next.js encountered uncached or runtime data during prerendering. `fetch(...)` … accessed outside of `<Suspense>` prevents the route from being prerendered." |
| Preview boundary around the whole dashboard | Temporarily removed the preview's own boundary and wrapped the whole `<main>` in it, then reverted | Screenshot `06` was taken 1 s after opening the page: **only the fallback is visible**. The title, intro, profile and client explorer are all hidden until the delayed preview finishes. |

## Issues found and fixed during testing

1. **Keyboard focus was lost while loading.** The first version used `disabled` on the Load posts button. When I pressed Enter, focus jumped to the page body, because disabled elements can't keep focus, so a keyboard user would lose their place. It now uses `aria-disabled` plus the existing `inFlight` ref guard. I re-tested: focus stays on the button during and after loading, and duplicate presses still start only one request (commit "Keep keyboard focus on Load posts while a request is running").
2. **Loading-button contrast:** a light indigo loading colour would have been about 2.9:1 for white text. I changed it to grey (4.76:1).
3. **Email wrapping:** in the two-column layout the email broke as "Sincere@april. biz", so the profile fields are now stacked.

## Not tested

- The network-failure branch inside the app itself (the friendly "couldn't reach" message). The `TypeError` behaviour was checked in the console as shown above, but there's no demo scenario that disconnects the network.
- Firefox and Safari, and real screen-reader output (NVDA or VoiceOver).

## Screenshots

| File | State |
| --- | --- |
| `evidence/01-normal.png` | Normal state, desktop, everything loaded (client explorer idle) |
| `evidence/02-server-preview-loading.png` | 1 s after opening: preview fallback visible, everything else on screen |
| `evidence/03-client-http-error.jpg` | Client error (simulated 503) with Retry; profile and preview still there |
| `evidence/04-client-empty.jpg` | Client empty state: "No posts found" |
| `evidence/05-mobile-360.png` | 360 px wide phone layout |
| `evidence/06-experiment-boundary-around-whole-dashboard.png` | Experiment only (not the submitted code): one boundary around everything hides the whole page |

A screenshot alone can't prove timing. The steps and numbers above describe how each state was produced.
