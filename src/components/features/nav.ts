import type { IconName } from '@/components/ui'

export interface NavItem {
  to: string
  label: string
  icon: IconName
}

/** Phone bottom tabs. The sidebar shows these plus the extra links below. */
export const TAB_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/journal', label: 'Journal', icon: 'book' },
  { to: '/wine', label: 'Wine', icon: 'wine' },
  { to: '/wishlist', label: 'Wishlist', icon: 'heart' },
  { to: '/profile', label: 'Profile', icon: 'user' },
]

export const EXTRA_ITEMS: NavItem[] = [
  { to: '/tonight', label: 'Where tonight?', icon: 'sparkle' },
  { to: '/map', label: 'Map', icon: 'map' },
  { to: '/year', label: 'Year in review', icon: 'chart' },
]
