import type { SupabaseClient } from '@supabase/supabase-js'
import type { PhotoStorage } from '@/data/repositories'
import { shrinkToJpeg } from '@/lib/image'
import { friendlyError } from './mapping'
import type { HouseholdScope } from './scope'

const BUCKET = 'photos'
const PREFIX = 'sb://'
/** Signed links last an hour; the app asks for a fresh one when needed. */
const SIGNED_SECONDS = 3600

const randomName = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

/**
 * Photos live in a private bucket, one folder per household. The record stores `sb://<path>`
 * and the app asks for a short-lived signed link whenever it needs to show the picture.
 */
export class SupabasePhotoStorage implements PhotoStorage {
  constructor(
    private readonly client: SupabaseClient,
    private readonly scope: HouseholdScope,
    /** Resizes before upload. Replaceable so tests don't need a real image decoder. */
    private readonly prepare: (file: Blob) => Promise<Blob> = shrinkToJpeg,
  ) {}

  async save(file: File): Promise<string> {
    const householdId = await this.scope.householdId()
    const blob = await this.prepare(file)
    const path = `${householdId}/${randomName()}.jpg`
    const { error } = await this.client.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) throw friendlyError(error)
    return `${PREFIX}${path}`
  }

  async resolve(ref: string): Promise<string> {
    // Anything that isn't one of ours (an older data: URL, for example) is shown as it is.
    if (!ref.startsWith(PREFIX)) return ref
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(ref.slice(PREFIX.length), SIGNED_SECONDS)
    if (error || !data) throw new Error('Could not load that photo.')
    return data.signedUrl
  }

  async remove(ref: string): Promise<void> {
    if (!ref.startsWith(PREFIX)) return
    const { error } = await this.client.storage.from(BUCKET).remove([ref.slice(PREFIX.length)])
    if (error) throw friendlyError(error)
  }
}
