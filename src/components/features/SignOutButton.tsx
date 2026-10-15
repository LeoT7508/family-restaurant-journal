import { Button, Icon, useToast } from '@/components/ui'
import { useData } from '@/data/DataProvider'
import { useSignOut } from '@/hooks/account'

/** Signs out of a real account. Renders nothing for the sample-data mode, which has no sign-in. */
export function SignOutButton({ iconOnly }: { iconOnly?: boolean }) {
  const { account } = useData()
  const signOut = useSignOut()
  const toast = useToast()
  if (!account) return null
  return (
    <Button
      variant="ghost"
      loading={signOut.isPending}
      aria-label={iconOnly ? 'Sign out' : undefined}
      className={iconOnly ? 'px-0 min-w-touch' : undefined}
      onClick={() =>
        signOut.mutate(undefined, {
          onSuccess: () => toast.show('Signed out.'),
          onError: (e) => toast.show(e.message, 'error'),
        })
      }
    >
      <Icon name="logout" size={20} />
      {!iconOnly && 'Sign out'}
    </Button>
  )
}
