import { useQuery } from '@tanstack/react-query'
import type { ImgHTMLAttributes } from 'react'
import { useData } from '@/data/DataProvider'
import { cn } from '@/lib/cn'

type StoredImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string }

/**
 * Shows a photo from a stored reference. With private cloud storage the reference is turned into a
 * short-lived signed link first; previews and older inline photos are shown as they are.
 */
export function StoredImage({ src, alt = '', className, ...rest }: StoredImageProps) {
  const { photos } = useData()
  const direct = src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')
  const resolved = useQuery({
    queryKey: ['photo', src],
    queryFn: () => photos.resolve(src),
    enabled: !direct,
    // Signed links last an hour; refresh a little before that.
    staleTime: 50 * 60 * 1000,
    retry: 1,
  })
  const url = direct ? src : resolved.data

  if (!url) {
    return <div aria-hidden="true" className={cn('animate-pulse bg-surface-2', className)} />
  }
  return <img src={url} alt={alt} className={className} {...rest} />
}
