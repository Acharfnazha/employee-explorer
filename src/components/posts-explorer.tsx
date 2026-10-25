"use client";

import { useRef, useState } from "react";
import { EMPLOYEE_ID, describeError, postsUrl, readJson, type Post } from "@/lib/api";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; posts: Post[] }
  | { status: "empty" }
  | { status: "error"; message: string };

/** Client Component: fetches posts in the browser, only after a click. */
export default function PostsExplorer() {
  const [state, setState] = useState<State>({ status: "idle" });
  // A ref updates immediately, so a second click in the same instant can't
  // start a duplicate request before the disabled button re-renders.
  const inFlight = useRef(false);

  async function loadPosts() {
    if (inFlight.current) return;
    inFlight.current = true;
    setState({ status: "loading" });

    try {
      const response = await fetch(postsUrl(EMPLOYEE_ID));
      const posts = await readJson<Post[]>(response, "Posts");
      // An empty array is a successful answer, not an error.
      setState(posts.length === 0 ? { status: "empty" } : { status: "success", posts });
    } catch (error) {
      setState({ status: "error", message: describeError(error, "posts") });
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
      <button
        type="button"
        onClick={loadPosts}
        disabled={isLoading}
        aria-busy={isLoading}
        className="min-h-11 cursor-pointer rounded-lg bg-indigo-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-indigo-400"
      >
        {buttonLabel}
      </button>

      <div aria-live="polite">
        {state.status === "idle" && (
          <p className="text-sm text-slate-600">
            Nothing is loaded yet. Press <strong>Load posts</strong>. No request is sent before
            you click.
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
