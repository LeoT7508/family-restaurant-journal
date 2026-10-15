import { describe, expect, it, vi } from 'vitest'
import { checkBackend } from './health'

const reply = (status: number, body?: unknown) =>
  vi
    .fn()
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }))

describe('checkBackend', () => {
  it('reports everything working when the table answers', async () => {
    const fetchFn = reply(200, [])
    expect(await checkBackend('https://p.supabase.co/', 'anon-key', fetchFn)).toEqual({
      reachable: true,
      keyAccepted: true,
      tablesReady: true,
    })
    const [url, init] = fetchFn.mock.calls[0]!
    expect(url).toBe('https://p.supabase.co/rest/v1/households?select=id&limit=1')
    expect((init as RequestInit).headers).toMatchObject({
      apikey: 'anon-key',
      Authorization: 'Bearer anon-key',
    })
  })

  it('reports an unreachable project', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await checkBackend('https://p.supabase.co', 'k', fetchFn)).toEqual({
      reachable: false,
      keyAccepted: false,
      tablesReady: false,
    })
  })

  it('reports a rejected key', async () => {
    const result = await checkBackend(
      'https://p.supabase.co',
      'bad',
      reply(401, { message: 'Invalid API key' }),
    )
    expect(result).toMatchObject({
      reachable: true,
      keyAccepted: false,
      tablesReady: false,
      detail: 'Invalid API key',
    })
  })

  it('reports tables that have not been created yet', async () => {
    const result = await checkBackend(
      'https://p.supabase.co',
      'k',
      reply(404, { code: 'PGRST205', message: "Could not find the table 'public.households'" }),
    )
    expect(result).toMatchObject({ reachable: true, keyAccepted: true, tablesReady: false })
    expect(result.detail).toMatch(/households/)
  })

  it('treats a server error as set-up-not-ready without crashing on a non-JSON body', async () => {
    const result = await checkBackend('https://p.supabase.co', 'k', reply(500))
    expect(result).toMatchObject({ reachable: true, tablesReady: false })
    expect(result.detail).toMatch(/500/)
  })
})
