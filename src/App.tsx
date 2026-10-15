import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/queryClient'
import { RouterProvider, type createBrowserRouter } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { DataProvider, useBackendInfo } from '@/data/DataProvider'
import { SetupNeeded } from '@/components/features/SetupNeeded'
import type { DataLayer } from '@/data/repositories'
import { AuthGate } from '@/components/features/AuthGate'
import { ToastProvider } from '@/components/ui'

interface AppProps {
  router: ReturnType<typeof createBrowserRouter>
  queryClient?: QueryClient
  /** Tests inject a data layer; the app uses the one DataProvider chooses. */
  data?: DataLayer
}

const SAMPLE_OK_KEY = 'frj.sampleOk'

/** Stops the half-finished setup (URL but no key) from silently looking like a working backend. */
function SetupCheck({ children }: { children: ReactNode }) {
  const { keyMissing } = useBackendInfo()
  const [ok, setOk] = useState(() => {
    try {
      return sessionStorage.getItem(SAMPLE_OK_KEY) === '1'
    } catch {
      return false
    }
  })
  if (keyMissing && !ok) {
    return (
      <SetupNeeded
        onContinue={() => {
          try {
            sessionStorage.setItem(SAMPLE_OK_KEY, '1')
          } catch {
            /* fine: it just asks again next visit */
          }
          setOk(true)
        }}
      />
    )
  }
  return <>{children}</>
}

export default function App({ router, queryClient, data }: AppProps) {
  const client = queryClient ?? createQueryClient()
  return (
    <QueryClientProvider client={client}>
      <DataProvider value={data}>
        <ToastProvider>
          <SetupCheck>
            <AuthGate>
              <RouterProvider router={router} />
            </AuthGate>
          </SetupCheck>
        </ToastProvider>
      </DataProvider>
    </QueryClientProvider>
  )
}
