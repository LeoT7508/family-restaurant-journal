import { useMembers, useSession } from './queries'

/** The parent currently using the app (mock auth), with loading flags. */
export function useCurrentUser() {
  const session = useSession()
  const members = useMembers()
  const member = members.data?.find((m) => m.id === session.data?.memberId) ?? null
  return {
    member,
    isLoading: session.isLoading || members.isLoading,
    isError: session.isError || members.isError,
    refetch: () => {
      void session.refetch()
      void members.refetch()
    },
  }
}
