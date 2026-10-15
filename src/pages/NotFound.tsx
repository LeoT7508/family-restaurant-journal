import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/features/PageHeader'
import { buttonStyles, EmptyState } from '@/components/ui'

export default function NotFound() {
  return (
    <div>
      <PageHeader title="Page not found" />
      <EmptyState
        icon="alert"
        title="We couldn't find that page"
        description="The link may be old or mistyped."
        action={
          <Link to="/" className={buttonStyles('primary')}>
            Back home
          </Link>
        }
      />
    </div>
  )
}
