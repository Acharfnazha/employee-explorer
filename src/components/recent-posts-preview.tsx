import { connection } from "next/server";
import {
  EMPLOYEE_ID,
  describeError,
  postsUrl,
  readJson,
  type Post,
} from "@/lib/api";

/**
 * LEARNING SIMULATION: an intentional 2-second delay so the Suspense
 * fallback stays on screen long enough to see. Real code would not wait.
 */
export const PREVIEW_DEMO_DELAY_MS = 2000;

type PreviewResult = { ok: true; posts: Post[] } | { ok: false; message: string };

async function loadRecentPosts(employeeId: number): Promise<PreviewResult> {
  try {
    const response = await fetch(postsUrl(employeeId));
    const posts = await readJson<Post[]>(response, "Recent posts");
    return { ok: true, posts: posts.slice(0, 3) };
  } catch (error) {
    return { ok: false, message: describeError(error, "recent posts") };
  }
}

/**
 * Async Server Component rendered inside its own <Suspense> boundary.
 * While it is awaiting, React shows the boundary's fallback and streams
 * this content in when it resolves. Everything outside the boundary stays.
 */
export default async function RecentPostsPreview() {
  // Wait for a real incoming request, so the demo delay runs on every visit
  // instead of once while the page is prerendered.
  await connection();
  await new Promise((resolve) => setTimeout(resolve, PREVIEW_DEMO_DELAY_MS));

  const result = await loadRecentPosts(EMPLOYEE_ID);

  if (!result.ok) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
        {result.message}
      </p>
    );
  }

  if (result.posts.length === 0) {
    return <p className="text-sm text-slate-600">This employee has no posts yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {result.posts.map((post, index) => (
        <li key={post.id} className="flex gap-3 text-sm leading-6 text-slate-800">
          <span className="font-semibold text-indigo-700">{index + 1}.</span>
          <span className="first-letter:uppercase">{post.title}</span>
        </li>
      ))}
    </ol>
  );
}

/** Suspense fallback: same height as the real list, so nothing jumps. */
export function RecentPostsSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <p className="mb-3 text-sm font-medium text-indigo-700">
        Loading the 3 latest posts… (2-second demo delay)
      </p>
      <div className="space-y-2" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-6 animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
