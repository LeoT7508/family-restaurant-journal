import { useState } from 'react'
import { StoredImage } from './StoredImage'
import { Icon, useToast } from '@/components/ui'
import { useData } from '@/data/DataProvider'

interface PhotoFieldProps {
  label: string
  value?: string
  onChange: (url: string | undefined) => void
}

/** Pick a photo, store it through PhotoStorage, and hand back its URL. */
export function PhotoField({ label, value, onChange }: PhotoFieldProps) {
  const { photos } = useData()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const pick = async (file: File) => {
    setBusy(true)
    try {
      onChange(await photos.save(file))
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Could not add that photo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {value ? (
        <div className="relative w-fit">
          <StoredImage src={value} alt={label} className="h-28 w-28 rounded-lg object-cover" />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="absolute -right-2 -top-2 flex h-touch w-touch items-center justify-center rounded-full bg-ink text-canvas shadow-card"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      ) : (
        <label className="flex min-h-touch w-fit cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-line px-4 py-2 font-medium hover:bg-surface-2 focus-within:ring-2 focus-within:ring-accent">
          <Icon name="camera" />
          {busy ? 'Adding…' : 'Add a photo'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void pick(file)
              e.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}
