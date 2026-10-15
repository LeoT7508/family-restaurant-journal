import { useCallback, useEffect, useState } from 'react'

export type ThemeSetting = 'light' | 'dark' | 'system'
const KEY = 'frj.theme'

function readSetting(): ThemeSetting {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

function apply(setting: ThemeSetting) {
  const dark =
    setting === 'dark' ||
    (setting === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function useTheme() {
  const [setting, setSetting] = useState<ThemeSetting>(readSetting)

  useEffect(() => {
    apply(setting)
    if (setting !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setting])

  const update = useCallback((next: ThemeSetting) => {
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* the choice still applies for this visit */
    }
    setSetting(next)
  }, [])

  return { setting, setTheme: update }
}
