import type { ConnectionStatus } from '@/data/repositories'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/**
 * One cheap read-only request that answers three questions: can we reach the project, does it accept
 * our key, and have the tables been created. With row-level security an unsigned request just sees
 * zero rows, so a 200 means "the table is there".
 */
export async function checkBackend(
  url: string,
  key: string,
  fetchFn: FetchLike = (input, init) => fetch(input, init),
): Promise<ConnectionStatus> {
  let response: Response
  try {
    response = await fetchFn(`${url.replace(/\/$/, '')}/rest/v1/households?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
  } catch {
    return { reachable: false, keyAccepted: false, tablesReady: false }
  }

  if (response.ok) return { reachable: true, keyAccepted: true, tablesReady: true }

  let code = ''
  let message = ''
  try {
    const body = (await response.json()) as { code?: string; message?: string }
    code = body.code ?? ''
    message = body.message ?? ''
  } catch {
    /* not JSON */
  }

  // A missing table is reported as PGRST205 (or the Postgres code 42P01) with a 404.
  if (response.status === 404 || code === 'PGRST205' || code === '42P01') {
    return { reachable: true, keyAccepted: true, tablesReady: false, detail: message || undefined }
  }
  if (response.status === 401 || response.status === 403) {
    return { reachable: true, keyAccepted: false, tablesReady: false, detail: message || undefined }
  }
  return {
    reachable: true,
    keyAccepted: true,
    tablesReady: false,
    detail: message || `Server answered ${response.status}.`,
  }
}
