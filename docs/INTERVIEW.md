# Interview notes: Yehia Meets Maya

## Part 1 · Initial predictions (written before implementation)

These are my predictions before writing any feature code. I'm keeping them as they are. What I learned after testing is added in Part 2, below them.

**1. Where will each of the three requests run?**

- **Employee profile (`GET /users/1`):** on the server. It's an async Server Component, so Next.js calls JSONPlaceholder from the Node.js server while rendering the page. The browser never sends this request; it only receives the finished HTML.
- **Recent posts preview (`GET /posts?userId=1`):** also on the server, in its own async Server Component.
- **"Load posts" explorer (`GET /posts?userId=1`):** in the browser. The Client Component calls `fetch` inside the click handler, so the request goes straight from the browser to JSONPlaceholder and should appear in the Network panel. The two server requests should not appear there.

**2. What should remain visible while the server posts preview loads?**

Everything outside the preview's Suspense boundary: the page title, the introduction, the frame of the preview section with its heading, the employee profile (once its own request finishes), and the client explorer with its Load posts button. Only the inside of the preview should be replaced by its fallback until the delayed request finishes and the content streams in.

**3. Will wrapping a click-handler fetch in Suspense automatically display its fallback?**

No. Suspense shows its fallback when a component suspends *while rendering*, for example an async Server Component that is awaiting data. A `fetch` started inside an `onClick` handler runs after rendering, so React doesn't know the component is "waiting". I need to track the loading state myself with `useState` and show my own loading UI.

**4. If an HTTP response has status 503, will `fetch` automatically throw?**

No. `fetch` only rejects when the request itself fails (no connection, DNS error, CORS). A 503 is still a valid HTTP response, so `fetch` resolves with `response.ok === false` and `response.status === 503`. I have to check `response.ok` myself and throw my own error.

---

## Part 2 · What I learned after testing

The four predictions held up, but testing showed details I hadn't predicted:

- **Prediction 1 was right, with one addition.** Both server requests ran at **request time**, not at build time. With Cache Components (on by default in this Next.js version), `fetch` is not cached, and the terminal shows "auto no cache" for both. Because of that, the profile also needs its own `<Suspense>` boundary. When I removed it as an experiment, `npm run build` failed with "Next.js encountered uncached or runtime data during prerendering". I hadn't expected the profile to need a boundary.
- **Prediction 2 was right.** But "visible" needed a real check. React sends finished HTML early in hidden pieces, so seeing text in the response doesn't prove it is on screen. I confirmed visibility with a screenshot taken 1 second in (`evidence/02`).
- **Prediction 3 was right.** The click-handler request never showed a Suspense fallback; I had to build the loading state myself.
- **Prediction 4 was right.** A real `GET /users/9999` resolved with `status: 404` and did not throw. Only a request to an address that doesn't exist rejected (`TypeError: Failed to fetch`).

## Part 3 · The interview: Maya's questions

### Where does each request execute, and what evidence helped you verify that?

| Request | Runs | Evidence |
| --- | --- | --- |
| Profile, `GET /users/1` | Node.js server, at request time | The dev terminal printed `GET https://jsonplaceholder.typicode.com/users/1 200`. The browser's Network list had no jsonplaceholder request after the page loaded. |
| Preview, `GET /posts?userId=1` | Node.js server, at request time, after the 2 s demo delay | Also printed in the terminal, and the posts arrived about 2.2 s into the streamed response. Not in the browser's Network list. |
| Explorer, `GET /posts?userId=1` | The browser, only after a click | 0 jsonplaceholder requests in the Network list before the click, then exactly 1 (initiator `fetch`) after it. It never appears in the server terminal. |

The server and client requests use the same URL, but they show up in completely different places, which is how I told them apart.

### Why did you choose server fetching for the profile and client fetching for the button?

The profile is needed as soon as the page opens and needs no user input, so fetching it on the server means the HTML already contains the data. The browser makes no extra request and ships no fetching code for it. The full post list is only needed **if** the user asks for it, so fetching it up front would waste a request most visitors don't need. A click is a browser event, so that request has to start in a Client Component.

### What activates the preview's Suspense fallback? Why doesn't the click-handler request activate it automatically?

The preview is an async Server Component. While it awaits (`connection()`, the 2 s delay, then the fetch), it hasn't finished rendering, so React shows the nearest `<Suspense>` boundary's fallback and streams the real content in when it resolves. The click-handler `fetch` happens **after** rendering, inside an event handler. No component is suspended while it runs, so Suspense has nothing to react to. That's why the explorer tracks `loading`, `success`, `empty` and `error` itself with `useState`.

### What would change if you moved the preview's boundary around the whole dashboard?

I tried it (and reverted it). The whole page, including the title, intro, profile and Load posts button, was replaced by the fallback for about 2 seconds, because a boundary only reveals its content once **everything** inside it is ready. The slowest section would decide when anything appears (`evidence/06`). A focused boundary keeps the slow part from blocking the parts that are already ready.

**Where `loading.tsx` would apply:** it wraps the whole route segment's page in a Suspense boundary automatically. That suits a page where everything depends on the same slow data, or for showing something immediately during navigation. Here it would act like the "whole dashboard" boundary above, so for this mission I placed the boundary by hand around just the preview.

### How does your custom error class help, and what does `super(message)` do?

`ApiError extends Error` adds a `status` field. When `readJson()` sees `response.ok === false`, it throws `new ApiError(message, response.status)`. In a `catch` block I can then use `error instanceof ApiError` to tell "the server answered with a bad status" (and read which one: 404 gives "couldn't find", 5xx gives "unavailable") apart from other failures such as a `TypeError` from a network failure. `super(message)` calls the parent `Error` constructor. It sets `this.message` and the stack trace, so the object behaves like a normal error. It has to be called before I can use `this` in a subclass constructor.

### What is the difference between an HTTP failure, a network failure, and an empty result?

- **HTTP failure:** the server answered, but with an error status (404, 503). `fetch` resolves, `response.ok` is false, and I throw `ApiError` with the status.
- **Network failure:** there was no answer at all (offline, DNS, blocked). `fetch` rejects with a `TypeError` and there's no Response or status.
- **Empty result:** a successful answer (200) whose data is an empty array. That's not an error; it means "nothing to show", so the UI says "No posts found" with no error styling.

All three are tested: the simulated 503, a console fetch to a non-existent domain, the simulated empty array, and a real empty list from `userId=9999`.

### What happens if employee ID 1 is changed to 2 in all three sections?

I tested it by changing `EMPLOYEE_ID` in `src/lib/api.ts` (one constant shared by all three sections). Then I reverted it. The profile showed **Ervin Howell**, Shanna@melissa.tv, Deckow-Crist. The preview showed employee 2's first three titles, and the button fetched `posts?userId=2`. The section labels updated too. With a non-existent ID (9999), the profile showed its friendly 404 message while the preview and the explorer showed their empty states, and the rest of the page still worked.

### Which decision did you personally verify rather than accepting without checking?

That the 2-second delay really happens on **every** request in production. The brief warned that a delay can run only once during prerendering. I built the app, started `npm start`, and timed two separate requests: in both, the shell and fallback arrived at about 90 ms and the preview posts at about 2140 ms. So `await connection()` before the delay works as intended. I also checked that removing the profile's boundary breaks the build, rather than assuming the boundary was optional.

## AI use: one meaningful suggestion

I used an AI coding assistant while building this. One suggestion I changed after checking it:

- **What it proposed:** prevent duplicate requests by setting `disabled` on the Load posts button while loading.
- **How I checked it:** I used the page with only the keyboard: Tab to the button, press Enter, and check where focus goes.
- **What I found:** focus jumped to the page body as soon as loading started, because a disabled button can't keep focus. A keyboard user loses their place.
- **Decision: changed.** The button now uses `aria-disabled` and a ref guard (`inFlight`) that ignores clicks while a request is running. I re-tested: focus stays on the button, and pressing Enter four times during a Slow load still sends only one request.

A second suggestion I considered and **rejected**: the Next.js docs say to prefer `io()` over `connection()` with Cache Components. But `io()` work can be cached and prefetched, and this demo needs the delay to happen on each real visit. I kept `connection()` and confirmed the per-request timing in production.
