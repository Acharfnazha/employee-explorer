"use client";

import { useRef, useState } from "react";
import {
  ApiError,
  EMPLOYEE_ID,
  describeError,
  postsUrl,
  readJson,
  type Post,
} from "@/lib/api";

type Scenario = "success" | "slow" | "http-error" | "empty";

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: "success", label: "Success: real API request" },
  { value: "slow", label: "Slow: wait 2 seconds, then real API request" },
  { value: "http-error", label: "HTTP error: simulated 503 response" },
  { value: "empty", label: "Empty: simulated empty list" },
];

const SLOW_DEMO_DELAY_MS = 2000;

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; posts: Post[] }
  | { status: "empty" }
  | { status: "error"; message: string; httpStatus: number | null };

/**
 * Builds the Response for the chosen scenario. The two simulated scenarios
 * create a real Response object, so they go through exactly the same
 * readJson() check as a real request. Success and Slow always call the
 * real JSONPlaceholder API.
 */
async function getPostsResponse(scenario: Scenario): Promise<Response> {
  switch (scenario) {
    case "http-error":
      // SIMULATION: JSONPlaceholder did not return this.
      return new Response(JSON.stringify({ message: "Service unavailable" }), {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      });
    case "empty":
      // SIMULATION: a successful response whose body is an empty array.
      return new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    case "slow":
      await new Promise((resolve) => setTimeout(resolve, SLOW_DEMO_DELAY_MS));
      return fetch(postsUrl(EMPLOYEE_ID));
    case "success":
      return fetch(postsUrl(EMPLOYEE_ID));
  }
}

/** Client Component: fetches posts in the browser, only after a click. */
export default function PostsExplorer() {
  const [scenario, setScenario] = useState<Scenario>("success");
  const [state, setState] = useState<State>({ status: "idle" });
  // A ref updates immediately, so a second click in the same instant can't
  // start a duplicate request before the disabled button re-renders.
  const inFlight = useRef(false);

  async function loadPosts() {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({ status: "loading" });

    try {
      const response = await getPostsResponse(scenario);
      const posts = await readJson<Post[]>(response, "Posts");
      // An empty array is a successful answer, not an error.
      setState(posts.length === 0 ? { status: "empty" } : { status: "success", posts });
    } catch (error) {
      setState({
        status: "error",
        message: describeError(error, "posts"),
        // Only our ApiError carries an HTTP status. A network failure has none.
        httpStatus: error instanceof ApiError ? error.status : null,
      });
    } finally {
      // Runs after both success and failure, so loading always ends.
      inFlight.current = false;
    }
  }

  const isLoading = state.status === "loading";
  const buttonLabel = isLoading
    ? "Loading posts…"
    : state.status === "error"
      ? "Retry"
      : state.status === "idle"
        ? "Load posts"
        : "Load posts again";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="demo-scenario" className="block text-sm font-medium text-slate-700">
            Demo scenario <span className="font-normal text-slate-500">(testing simulation)</span>
          </label>
          <select
            id="demo-scenario"
            value={scenario}
            onChange={(event) => setScenario(event.target.value as Scenario)}
            className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
          >
            {SCENARIOS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {/* aria-disabled instead of disabled: a disabled button loses keyboard
            focus, so the user would be dropped back to the top of the page.
            The inFlight ref still ignores clicks while a request is running. */}
        <button
          type="button"
          onClick={loadPosts}
          aria-disabled={isLoading}
          aria-busy={isLoading}
          className="min-h-11 cursor-pointer rounded-lg bg-indigo-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 aria-disabled:cursor-not-allowed aria-disabled:bg-slate-500"
        >
          {buttonLabel}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        The scenario applies to the next Load or Retry. HTTP error and Empty are
        simulated in the browser; Success and Slow use the real API.
      </p>

      <div aria-live="polite">
        {state.status === "idle" && (
          <p className="text-sm text-slate-600">
            Nothing is loaded yet. Choose a scenario and press{" "}
            <strong>Load posts</strong>. No request is sent before you click.
          </p>
        )}

        {state.status === "loading" && (
          <p role="status" className="flex items-center gap-2 text-sm font-medium text-indigo-700">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-700 motion-reduce:animate-none"
            />
            Loading posts from the browser…
          </p>
        )}

        {state.status === "empty" && (
          <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
            No posts found
          </p>
        )}

        {state.status === "error" && (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">Couldn&apos;t load the posts.</p>
            <p>{state.message} You can try again.</p>
            <p className="mt-1 text-xs text-red-700">
              {state.httpStatus !== null
                ? `Error type: ApiError (HTTP ${state.httpStatus})`
                : "Error type: no HTTP response (network or unexpected error)"}
            </p>
          </div>
        )}

        {state.status === "success" && (
          <ul className="space-y-3">
            {state.posts.map((post) => (
              <li key={post.id} className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 first-letter:uppercase">
                  {post.title}
                </h3>
                <p className="mt-1 text-sm leading-6 whitespace-pre-line text-slate-600">
                  {post.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
