import type { PhotoStorage } from '@/data/repositories'

const MAX_EDGE = 1024

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That file could not be read as an image.'))
    img.src = src
  })
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the photo.'))
    reader.readAsDataURL(file)
  })
}

/** Shrinks the photo to ~1024px JPEG so it fits in localStorage. */
export class MockPhotoStorage implements PhotoStorage {
  async save(file: File): Promise<string> {
    const original = await readAsDataUrl(file)
    try {
      const img = await loadImage(original)
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return original
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.78)
    } catch {
      return original
    }
  }
  async resolve(ref: string): Promise<string> {
    return ref
  }
  async remove(): Promise<void> {
    /* data URLs live inside the record; nothing to delete separately */
  }
}
