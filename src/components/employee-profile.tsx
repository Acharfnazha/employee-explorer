import {
  EMPLOYEE_ID,
  describeError,
  employeeUrl,
  readJson,
  type Employee,
} from "@/lib/api";

type ProfileResult =
  | { ok: true; employee: Employee }
  | { ok: false; message: string };

// Runs on the server (Node.js), never in the browser.
async function loadEmployee(id: number): Promise<ProfileResult> {
  try {
    const response = await fetch(employeeUrl(id));
    const employee = await readJson<Employee>(response, "Employee profile");
    return { ok: true, employee };
  } catch (error) {
    // Caught here, next to the section it affects, so the rest of the page
    // still renders.
    return { ok: false, message: describeError(error, "employee profile") };
  }
}

/** Async Server Component: employee 1's name, email and company. */
export default async function EmployeeProfile() {
  const result = await loadEmployee(EMPLOYEE_ID);

  if (!result.ok) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
        {result.message} The rest of the dashboard still works.
      </p>
    );
  }

  const { employee } = result;
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-slate-500">Name</dt>
        <dd className="mt-0.5 text-base font-semibold text-slate-900">{employee.name}</dd>
      </div>
      <div className="min-w-0">
        <dt className="text-slate-500">Email</dt>
        <dd className="mt-0.5 break-words text-base font-semibold text-slate-900">
          {employee.email}
        </dd>
      </div>
      <div>
        <dt className="text-slate-500">Company</dt>
        <dd className="mt-0.5 text-base font-semibold text-slate-900">
          {employee.company.name}
        </dd>
      </div>
    </dl>
  );
}
