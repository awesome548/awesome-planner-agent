/**
 * Typed fetch wrapper for Next.js API routes that use the { ok, error } envelope.
 * Throws on !ok so TanStack Query treats it as an error.
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });

  const data = await res.json();

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data as T;
}
