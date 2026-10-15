/** Shrinks a photo to at most `maxEdge` pixels on its long side and re-encodes it as JPEG. */
export async function shrinkToJpeg(file: Blob, maxEdge = 1600, quality = 0.8): Promise<Blob> {
  try {
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('That file could not be read as an image.'))
        el.src = url
      })
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return file
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      )
      return blob ?? file
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return file
  }
}
