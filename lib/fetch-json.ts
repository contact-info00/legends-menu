export type ApiErrorBody = {
  error?: string
  message?: string
}

export function getApiErrorMessage(status: number, body?: ApiErrorBody): string {
  const detail = body?.error || body?.message
  switch (status) {
    case 401:
      return detail || 'Authentication required. Please log in again.'
    case 403:
      return detail || 'You do not have permission to perform this action.'
    case 404:
      return detail || 'The requested resource was not found.'
    case 409:
      return detail || 'This action conflicts with existing data.'
    case 422:
      return detail || 'The request could not be processed.'
    case 500:
      return detail || 'Internal server error. Please try again later.'
    default:
      return detail || `Request failed (${status})`
  }
}

export type FetchJsonResult<T> =
  | { ok: true; data: T; response: Response }
  | { ok: false; status: number; error: string; response: Response }

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<FetchJsonResult<T>> {
  const response = await fetch(input, {
    credentials: 'include',
    ...init,
  })

  const data = (await response.json().catch(() => ({}))) as T & ApiErrorBody

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: getApiErrorMessage(response.status, data),
      response,
    }
  }

  return { ok: true, data: data as T, response }
}
