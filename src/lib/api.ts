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

/** An HTTP response arrived, but its status was not successful (not 2xx). */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    // super(message) runs the Error constructor, which sets this.message
    // and captures the stack trace.
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * The one place that decides whether a Response is a success.
 * fetch() resolves for 404/503 too, so the status must be checked here.
 */
export async function readJson<T>(response: Response, resource: string): Promise<T> {
  if (!response.ok) {
    throw new ApiError(
      `${resource} request failed with HTTP ${response.status}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export const employeeUrl = (id: number) => `${API_BASE_URL}/users/${id}`;
export const postsUrl = (employeeId: number) =>
  `${API_BASE_URL}/posts?userId=${employeeId}`;

/** Turns any caught value into a message that is safe to show to a person. */
export function describeError(error: unknown, resource: string): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return `We couldn't find the ${resource}.`;
    if (error.status >= 500) {
      return `The ${resource} service is unavailable right now (HTTP ${error.status}).`;
    }
    return `The ${resource} request was rejected (HTTP ${error.status}).`;
  }
  if (error instanceof TypeError) {
    // fetch() rejects with a TypeError when there is no response at all:
    // offline, DNS failure, blocked request.
    return `We couldn't reach the ${resource} service. Check the connection.`;
  }
  return `Something went wrong while loading the ${resource}.`;
}
