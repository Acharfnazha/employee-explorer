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
