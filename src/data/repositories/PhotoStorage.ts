/** Where photos live. The mock stores small data URLs; a real back end returns private storage references. */
export interface PhotoStorage {
  /** Saves an image and returns a reference to store on the record. */
  save(file: File): Promise<string>
  /** Turns a stored reference into something an <img src> can show (a signed URL for private storage). */
  resolve(ref: string): Promise<string>
  remove(ref: string): Promise<void>
}
