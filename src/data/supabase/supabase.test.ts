import { beforeEach, describe, expect, it } from 'vitest'
import { assertPublicKey } from './client'
import { camelToSnake, friendlyError, patchToRow, rowToRecord, snakeToCamel } from './mapping'
import { FakeSupabase } from './fakeSupabase'
import type { HouseholdScope } from './scope'
import {
  SupabaseDishRepository,
  SupabaseFamilyRepository,
  SupabaseKidInfoRepository,
  SupabaseRestaurantRepository,
  SupabaseVisitRepository,
  SupabaseWishlistRepository,
} from './repositories'
import { SupabaseAuthService } from './SupabaseAuthService'
import { SupabaseAccountService } from './SupabaseAccountService'
import { SupabasePhotoStorage } from './SupabasePhotoStorage'

const HID = 'h-1'
const scope = (memberId: string | null = null): HouseholdScope => ({
  householdId: async () => HID,
  membership: async () => ({ householdId: HID, memberId }),
  reset: () => {},
})

const restaurantRow = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  household_id: HID,
  place_id: 'mock:pita',
  name: 'Pita Inn',
  address: 'Skokie',
  cuisine: 'Mediterranean',
  price_level: 1,
  drive_minutes: 17,
  status: 'open',
  tags: ['kid-friendly'],
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
  ...over,
})

describe('mapping', () => {
  it('converts between camelCase and snake_case', () => {
    expect(camelToSnake('grapeOrRegion')).toBe('grape_or_region')
    expect(snakeToCamel('favorite_dish_by_child')).toBe('favoriteDishByChild')
    expect(camelToSnake('id')).toBe('id')
  })

  it('maps a row to a record: camelCase, nulls dropped, household hidden, marked synced', () => {
    const rec = rowToRecord({
      id: 'v1',
      household_id: HID,
      go_again: null,
      family_rating: 4,
      ratings: { alex: 5, sam_id: 3 },
      created_at: 'x',
    })
    expect(rec).toEqual({
      id: 'v1',
      familyRating: 4,
      ratings: { alex: 5, sam_id: 3 }, // nested keys are NOT converted
      createdAt: 'x',
      syncStatus: 'synced',
    })
  })

  it('maps a patch to columns, sending cleared fields as null and never server-owned fields', () => {
    expect(
      patchToRow({
        goAgain: undefined,
        familyRating: 5,
        isDraft: false,
        id: 'nope',
        createdAt: 'nope',
        syncStatus: 'local',
        ratings: { someId: 4 },
      }),
    ).toEqual({ go_again: null, family_rating: 5, is_draft: false, ratings: { someId: 4 } })
  })

  it('turns database errors into plain sentences', () => {
    expect(friendlyError({ message: 'x', code: '23505' }).message).toMatch(/already exists/i)
    expect(friendlyError({ message: 'x', code: '42501' }).message).toMatch(/permission/i)
    expect(friendlyError({ message: 'x', code: 'PGRST301' }).message).toMatch(/sign in again/i)
    expect(friendlyError({ message: 'boom' }).message).toBe('boom')
  })
})

describe('key safety', () => {
  const jwt = (role: string) =>
    `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role })).replace(/=/g, '')}.sig`

  it('refuses secret and service_role keys', () => {
    expect(() => assertPublicKey('sb_secret_abc123')).toThrow(/secret/i)
    expect(() => assertPublicKey(jwt('service_role'))).toThrow(/service_role/i)
  })

  it('accepts anon and publishable keys', () => {
    expect(() => assertPublicKey(jwt('anon'))).not.toThrow()
    expect(() => assertPublicKey('sb_publishable_abc123')).not.toThrow()
  })
})

describe('repositories (against a fake Supabase)', () => {
  let db: FakeSupabase
  beforeEach(() => {
    db = new FakeSupabase()
    db.unique = {
      restaurants: ['household_id', 'place_id'],
      wishlist_items: ['household_id', 'restaurant_id'],
    }
  })

  it('lists only this household’s rows, as validated camelCase records', async () => {
    db.seed('restaurants', [
      restaurantRow(),
      restaurantRow({ id: 'r2', household_id: 'someone-else' }),
    ])
    const list = await new SupabaseRestaurantRepository(db.asClient(), scope()).list()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      id: 'r1',
      placeId: 'mock:pita',
      priceLevel: 1,
      driveMinutes: 17,
      syncStatus: 'synced',
    })
    expect(list[0]).not.toHaveProperty('householdId')
  })

  it('skips a row that does not fit the schema instead of failing the list', async () => {
    db.seed('restaurants', [restaurantRow(), restaurantRow({ id: 'bad', price_level: 9 })])
    const list = await new SupabaseRestaurantRepository(db.asClient(), scope()).list()
    expect(list.map((r) => r.id)).toEqual(['r1'])
  })

  it('create stamps the household and returns the saved record', async () => {
    const repo = new SupabaseVisitRepository(db.asClient(), scope())
    const created = await repo.create({
      restaurantId: 'r1',
      date: '2026-10-01',
      loggedBy: 'm1',
      occasions: ['Date night'],
      ratings: { m1: 5 },
      notes: 'nice',
      photos: [],
      isDraft: true,
    })
    expect(db.tables.visits![0]).toMatchObject({
      household_id: HID,
      restaurant_id: 'r1',
      logged_by: 'm1',
      is_draft: true,
      ratings: { m1: 5 },
    })
    expect(created).toMatchObject({ restaurantId: 'r1', isDraft: true, syncStatus: 'synced' })
    expect(created.id).toBeTruthy()
  })

  it('update clears an optional field with null and returns the change', async () => {
    const repo = new SupabaseVisitRepository(db.asClient(), scope())
    const v = await repo.create({
      restaurantId: 'r1',
      date: '2026-10-01',
      loggedBy: 'm1',
      occasions: [],
      goAgain: 'yes',
      familyRating: 4,
      ratings: {},
      notes: '',
      photos: [],
      isDraft: false,
    })
    const updated = await repo.update(v.id, { goAgain: undefined, notes: 'changed' })
    expect(db.tables.visits![0]).toMatchObject({ go_again: null, notes: 'changed' })
    expect(updated.goAgain).toBeUndefined()
    expect(updated.familyRating).toBe(4)
  })

  it('get returns null for a missing record and remove deletes', async () => {
    db.seed('restaurants', [restaurantRow()])
    const repo = new SupabaseRestaurantRepository(db.asClient(), scope())
    expect(await repo.get('nope')).toBeNull()
    await repo.remove('r1')
    expect(await repo.list()).toEqual([])
  })

  it('update on a missing record gives a clear error', async () => {
    const repo = new SupabaseRestaurantRepository(db.asClient(), scope())
    await expect(repo.update('nope', { name: 'x' })).rejects.toThrow(/not found/i)
  })

  it('upsertFromPlace saves a place once', async () => {
    const repo = new SupabaseRestaurantRepository(db.asClient(), scope())
    const place = {
      placeId: 'mock:x',
      name: 'X',
      address: '',
      cuisine: 'Pizza',
      priceLevel: 2,
      driveMinutes: 5,
      tags: [],
    }
    const a = await repo.upsertFromPlace(place)
    const b = await repo.upsertFromPlace(place)
    expect(a.id).toBe(b.id)
    expect(db.tables.restaurants).toHaveLength(1)
    expect(db.tables.restaurants![0]).toMatchObject({ household_id: HID, status: 'open' })
  })

  it('upsertFromPlace survives two devices saving the same place at once', async () => {
    const repo = new SupabaseRestaurantRepository(db.asClient(), scope())
    // Simulate: our first lookup finds nothing, then the other device's row appears before our insert.
    const realFind = repo.findByPlaceId.bind(repo)
    let calls = 0
    repo.findByPlaceId = async (id) => {
      calls += 1
      if (calls === 1) {
        db.seed('restaurants', [restaurantRow({ id: 'winner', place_id: id })])
        return null
      }
      return realFind(id)
    }
    const r = await repo.upsertFromPlace({
      placeId: 'mock:race',
      name: 'Race',
      address: '',
      cuisine: 'Pizza',
      priceLevel: 2,
      driveMinutes: 5,
      tags: [],
    })
    expect(r.id).toBe('winner')
  })

  it('filters children by their parent', async () => {
    db.seed('dishes', [
      {
        id: 'd1',
        household_id: HID,
        visit_id: 'v1',
        name: 'A',
        eaten_by: [],
        verdicts: {},
        safe_for_allergy: 'unknown',
        created_at: 'x',
        updated_at: 'x',
      },
      {
        id: 'd2',
        household_id: HID,
        visit_id: 'v2',
        name: 'B',
        eaten_by: [],
        verdicts: {},
        safe_for_allergy: 'safe',
        created_at: 'x',
        updated_at: 'x',
      },
    ])
    const repo = new SupabaseDishRepository(db.asClient(), scope())
    expect((await repo.listByVisit('v1')).map((d) => d.name)).toEqual(['A'])
    await repo.removeByVisit('v1')
    expect((await repo.list()).map((d) => d.id)).toEqual(['d2'])
    expect((await repo.list())[0]!.safeForAllergy).toBe('safe')
  })

  it('wishlist and kid info lookups work', async () => {
    db.seed('wishlist_items', [
      {
        id: 'w1',
        household_id: HID,
        restaurant_id: 'r1',
        added_by: 'm1',
        note: '',
        created_at: 'x',
        updated_at: 'x',
      },
    ])
    db.seed('kid_info', [
      {
        id: 'k1',
        household_id: HID,
        restaurant_id: 'r1',
        kids_menu: true,
        high_chair: false,
        room_for_stroller: true,
        quick_service: false,
        favorite_dish_by_child: { c1: 'fries' },
        created_at: 'x',
        updated_at: 'x',
      },
    ])
    expect(
      (await new SupabaseWishlistRepository(db.asClient(), scope()).findByRestaurant('r1'))?.id,
    ).toBe('w1')
    expect(
      await new SupabaseWishlistRepository(db.asClient(), scope()).findByRestaurant('zzz'),
    ).toBeNull()
    const kids = await new SupabaseKidInfoRepository(db.asClient(), scope()).listByRestaurant('r1')
    expect(kids[0]).toMatchObject({
      kidsMenu: true,
      roomForStroller: true,
      favoriteDishByChild: { c1: 'fries' },
    })
  })

  describe('family and household', () => {
    const householdRow = (over: Record<string, unknown> = {}) => ({
      id: HID,
      name: 'Us',
      home_zip: '60601',
      home_label: 'Chicago, IL 60601',
      drive_radius_minutes: 20,
      travel_destination: null,
      invite_code: 'abc',
      created_at: 'x',
      updated_at: 'x',
      ...over,
    })

    it('reads the household and turns travel_destination into travel', async () => {
      db.seed('households', [householdRow({ travel_destination: 'Orlando' })])
      const h = await new SupabaseFamilyRepository(db.asClient(), scope()).getHousehold()
      expect(h).toMatchObject({
        homeZip: '60601',
        driveRadiusMinutes: 20,
        travel: { destination: 'Orlando' },
      })
      expect(h).not.toHaveProperty('inviteCode')
    })

    it('turns travel mode on and off', async () => {
      db.seed('households', [householdRow()])
      const repo = new SupabaseFamilyRepository(db.asClient(), scope())
      const on = await repo.updateHousehold({ travel: { destination: 'Austin' } })
      expect(on.travel).toEqual({ destination: 'Austin' })
      expect(db.tables.households![0]!.travel_destination).toBe('Austin')
      const off = await repo.updateHousehold({ travel: undefined })
      expect(off.travel).toBeUndefined()
      expect(db.tables.households![0]!.travel_destination).toBeNull()
    })

    it('updates plain household fields', async () => {
      db.seed('households', [householdRow()])
      const h = await new SupabaseFamilyRepository(db.asClient(), scope()).updateHousehold({
        homeZip: '60634',
        driveRadiusMinutes: 30,
      })
      expect(h).toMatchObject({ homeZip: '60634', driveRadiusMinutes: 30 })
    })

    it('creates and updates members, keeping isParent in step with role', async () => {
      const repo = new SupabaseFamilyRepository(db.asClient(), scope())
      const kid = await repo.createMember({
        name: 'Nico',
        role: 'child',
        age: 4,
        allergies: ['peanut'],
        isParent: true, // ignored: role decides
      })
      expect(kid).toMatchObject({ isParent: false, allergies: ['peanut'], age: 4 })
      const grown = await repo.updateMember(kid.id, { role: 'parent' })
      expect(grown.isParent).toBe(true)
      expect((await repo.listMembers()).map((m) => m.name)).toEqual(['Nico'])
    })
  })
})

describe('sessions and accounts', () => {
  let db: FakeSupabase
  beforeEach(() => {
    db = new FakeSupabase()
  })
  const user = { id: 'u1', email: 'alex@example.com' }

  it('the session is the signed-in parent, or nothing until they pick one', async () => {
    expect(await new SupabaseAuthService(db.asClient(), scope('m1')).getSession()).toBeNull()
    db.session = { user }
    expect(await new SupabaseAuthService(db.asClient(), scope('m1')).getSession()).toEqual({
      memberId: 'm1',
    })
    expect(await new SupabaseAuthService(db.asClient(), scope(null)).getSession()).toBeNull()
  })

  it('walks through the setup states', async () => {
    const account = (s: HouseholdScope) => new SupabaseAccountService(db.asClient(), s)
    expect(await account(scope()).getState()).toEqual({ status: 'signed-out' })

    db.session = { user }
    const noHousehold: HouseholdScope = { ...scope(), membership: async () => null }
    expect(await account(noHousehold).getState()).toEqual({
      status: 'needs-household',
      email: user.email,
    })

    db.seed('households', [{ id: HID, invite_code: 'code123' }])
    expect(await account(scope(null)).getState()).toEqual({
      status: 'needs-member',
      email: user.email,
      inviteCode: 'code123',
    })
    expect(await account(scope('m1')).getState()).toEqual({
      status: 'ready',
      email: user.email,
      inviteCode: 'code123',
    })
  })

  it('asks Supabase to email a confirmation link that returns to this app', async () => {
    const account = new SupabaseAccountService(db.asClient(), scope(), 'http://localhost:5173')
    await account.signUp(' a@b.co ', 'longenough1')
    expect(db.authCalls[0]).toEqual({
      name: 'signUp',
      args: {
        email: 'a@b.co',
        password: 'longenough1',
        options: { emailRedirectTo: 'http://localhost:5173' },
      },
    })
  })

  it('resends the confirmation and requests password resets with the return address', async () => {
    const account = new SupabaseAccountService(db.asClient(), scope(), 'http://localhost:5173')
    await account.resendConfirmation('a@b.co')
    await account.requestPasswordReset(' a@b.co ')
    expect(db.authCalls).toEqual([
      {
        name: 'resend',
        args: {
          type: 'signup',
          email: 'a@b.co',
          options: { emailRedirectTo: 'http://localhost:5173' },
        },
      },
      { name: 'reset', args: { email: 'a@b.co', opts: { redirectTo: 'http://localhost:5173' } } },
    ])
  })

  it('surfaces email errors from the server', async () => {
    db.authError = { message: 'Email rate limit exceeded' }
    await expect(
      new SupabaseAccountService(db.asClient(), scope()).requestPasswordReset('a@b.co'),
    ).rejects.toThrow(/rate limit/i)
  })

  it('moves to password recovery when Supabase signals it, until a new password is saved', async () => {
    db.session = { user }
    db.seed('households', [{ id: HID, invite_code: 'code123' }])
    const account = new SupabaseAccountService(db.asClient(), scope('m1'))
    expect((await account.getState()).status).toBe('ready')
    db.emitAuthEvent('PASSWORD_RECOVERY')
    expect(await account.getState()).toEqual({ status: 'password-recovery', email: user.email })
    await expect(account.updatePassword('short')).rejects.toThrow(/at least 8/)
    await account.updatePassword('a-much-longer-one')
    expect(db.authCalls.at(-1)).toEqual({
      name: 'updateUser',
      args: { password: 'a-much-longer-one' },
    })
    expect((await account.getState()).status).toBe('ready')
  })

  it('recognises a reset link opened in a fresh tab from the URL', async () => {
    window.location.hash = '#access_token=abc&type=recovery'
    try {
      db.session = { user }
      const account = new SupabaseAccountService(db.asClient(), scope('m1'))
      expect((await account.getState()).status).toBe('password-recovery')
    } finally {
      window.location.hash = ''
    }
  })

  it('rejects short passwords before calling the server', async () => {
    await expect(
      new SupabaseAccountService(db.asClient(), scope()).signUp('a@b.co', 'short'),
    ).rejects.toThrow(/at least 8/)
  })

  it('reports when an email confirmation is needed', async () => {
    db.signUpResult = { session: null, user: { identities: [{}] } }
    expect(
      await new SupabaseAccountService(db.asClient(), scope()).signUp('a@b.co', 'longenough1'),
    ).toEqual({
      needsEmailConfirmation: true,
    })
  })

  it('detects an email that is already registered', async () => {
    db.signUpResult = { session: null, user: { identities: [] } }
    await expect(
      new SupabaseAccountService(db.asClient(), scope()).signUp('a@b.co', 'longenough1'),
    ).rejects.toThrow(/already has an account/i)
  })

  it('explains bad sign-ins in plain words', async () => {
    db.authError = { message: 'Invalid login credentials' }
    await expect(
      new SupabaseAccountService(db.asClient(), scope()).signIn('a@b.co', 'x'),
    ).rejects.toThrow(/did not match/i)
  })

  it('calls the setup functions with the right arguments', async () => {
    const account = new SupabaseAccountService(db.asClient(), scope())
    await account.createHousehold({
      name: ' Us ',
      homeZip: '60601',
      homeLabel: 'Chicago',
      driveRadiusMinutes: 20,
      members: [
        { name: 'Alex', role: 'parent', allergies: [] },
        { name: 'Mia', role: 'child', age: 2, allergies: ['egg'] },
      ],
    })
    await account.joinHousehold('abc')
    await account.claimMember('m1')
    expect(db.rpcCalls.map((c) => c.name)).toEqual([
      'create_household',
      'join_household',
      'claim_member',
    ])
    expect(db.rpcCalls[0]!.args).toMatchObject({
      p_name: 'Us',
      p_zip: '60601',
      p_radius: 20,
      p_members: [
        { name: 'Alex', role: 'parent', age: null, allergies: [] },
        { name: 'Mia', role: 'child', age: 2, allergies: ['egg'] },
      ],
    })
    expect(db.rpcCalls[1]!.args).toEqual({ p_code: 'abc' })
    expect(db.rpcCalls[2]!.args).toEqual({ p_member_id: 'm1' })
  })

  it('surfaces setup errors from the server', async () => {
    db.rpcError = { message: 'That invite code was not found.' }
    await expect(
      new SupabaseAccountService(db.asClient(), scope()).joinHousehold('nope'),
    ).rejects.toThrow(/invite code was not found/)
  })
})

describe('photo storage', () => {
  it('uploads into the household folder and returns a private reference', async () => {
    const db = new FakeSupabase()
    const photos = new SupabasePhotoStorage(db.asClient(), scope(), async (f) => f)
    const ref = await photos.save(new File(['x'], 'p.png', { type: 'image/png' }))
    expect(ref).toMatch(/^sb:\/\/h-1\/.+\.jpg$/)
    expect(db.uploads[0]!.path.startsWith(`${HID}/`)).toBe(true)
    expect(db.uploads[0]!.contentType).toBe('image/jpeg')
  })

  it('turns a reference into a short-lived signed link and passes other URLs through', async () => {
    const db = new FakeSupabase()
    const photos = new SupabasePhotoStorage(db.asClient(), scope(), async (f) => f)
    expect(await photos.resolve('sb://h-1/a.jpg')).toBe('https://signed.example/h-1/a.jpg?t=3600')
    expect(await photos.resolve('data:image/jpeg;base64,AAA')).toBe('data:image/jpeg;base64,AAA')
  })

  it('removes only its own files', async () => {
    const db = new FakeSupabase()
    const photos = new SupabasePhotoStorage(db.asClient(), scope(), async (f) => f)
    await photos.remove('sb://h-1/a.jpg')
    await photos.remove('data:image/jpeg;base64,AAA')
    expect(db.removed).toEqual(['h-1/a.jpg'])
  })
})
