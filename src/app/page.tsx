import { Suspense, type ReactNode } from "react";
import EmployeeProfile from "@/components/employee-profile";
import { EMPLOYEE_ID } from "@/lib/api";

// The page itself does no data fetching, so the shell (title, intro, section
// frames) is never blocked by a slow request.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-700">
          Maya&apos;s interview challenge
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Employee Explorer
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Three sections, three ways of loading data for employee #{EMPLOYEE_ID}: a profile
          fetched on the server, a recent-posts preview that streams in on its own, and a full
          post list the browser fetches only when you ask.
        </p>
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Section title="Employee profile" where={`Server Component · GET /users/${EMPLOYEE_ID}`}>
          <Suspense fallback={<ProfileSkeleton />}>
            <EmployeeProfile />
          </Suspense>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, where, children }: { title: string; where: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-0.5 mb-4 text-xs text-slate-500">{where}</p>
      {children}
    </section>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading employee profile…</span>
      <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((cell) => (
          <div
            key={cell}
            className="h-12 animate-pulse rounded bg-slate-200 motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
