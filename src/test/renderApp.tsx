import { render } from '@testing-library/react'
import App from '@/App'
import type { DataLayer } from '@/data/repositories'
import { createQueryClient } from '@/lib/queryClient'
import { createTestRouter } from '@/router'

export function renderApp(path = '/', options: { data?: DataLayer } = {}) {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false, staleTime: 0 } })
  return render(
    <App router={createTestRouter([path])} queryClient={queryClient} data={options.data} />,
  )
}
