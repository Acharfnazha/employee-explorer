// Shared by the Server Components and the client explorer, so it must not
// import anything server-only.

export const API_BASE_URL = "https://jsonplaceholder.typicode.com";

// JSONPlaceholder calls these records "users"; in this fictional interview
// they are employees. Every section uses the same ID.
export const EMPLOYEE_ID = 1;

export type Employee = {
  id: number;
  name: string;
  email: string;
  company: { name: string };
};

export type Post = {
  userId: number;
  id: number;
  title: string;
  body: string;
};

/**
 * The one place that decides whether a Response is a success.
 * fetch() resolves for 404/503 too, so the status must be checked here.
 */
export async function readJson<T>(response: Response, resource: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${resource} request failed with HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export const employeeUrl = (id: number) => `${API_BASE_URL}/users/${id}`;
export const postsUrl = (employeeId: number) =>
  `${API_BASE_URL}/posts?userId=${employeeId}`;

/** Turns any caught value into a message that is safe to show to a person. */
export function describeError(_error: unknown, resource: string): string {
  return `We couldn't load the ${resource} right now.`;
}
