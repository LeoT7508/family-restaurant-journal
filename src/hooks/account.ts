import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useData } from '@/data/DataProvider'
import type { HouseholdSetup } from '@/data/repositories'

export const accountKey = ['account'] as const

/** Sign-in state. Only meaningful when the back end has real accounts. */
export function useAccountState() {
  const { account } = useData()
  return useQuery({
    queryKey: accountKey,
    queryFn: () => account!.getState(),
    enabled: !!account,
    staleTime: 0,
  })
}

/** After signing in or out, everything cached belongs to someone else, so start clean. */
function useResetAfter() {
  const qc = useQueryClient()
  return async () => {
    // Drop everything cached for the previous person, but keep the account query so the gate can re-check.
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== accountKey[0] })
    await qc.refetchQueries({ queryKey: accountKey })
  }
}

export function useSignIn() {
  const { account } = useData()
  const reset = useResetAfter()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      account!.signIn(email, password),
    onSuccess: reset,
  })
}

export function useSignUp() {
  const { account } = useData()
  const reset = useResetAfter()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      account!.signUp(email, password),
    onSuccess: reset,
  })
}

export function useSignOut() {
  const { account } = useData()
  const reset = useResetAfter()
  return useMutation({ mutationFn: () => account!.signOut(), onSuccess: reset })
}

export function useCreateHousehold() {
  const { account } = useData()
  const reset = useResetAfter()
  return useMutation({
    mutationFn: (setup: HouseholdSetup) => account!.createHousehold(setup),
    onSuccess: reset,
  })
}

export function useJoinHousehold() {
  const { account } = useData()
  const reset = useResetAfter()
  return useMutation({
    mutationFn: (code: string) => account!.joinHousehold(code),
    onSuccess: reset,
  })
}

export function useClaimMember() {
  const { account } = useData()
  const reset = useResetAfter()
  return useMutation({
    mutationFn: (memberId: string) => account!.claimMember(memberId),
    onSuccess: reset,
  })
}

/** Plain async actions for the sign-in page. Each refreshes the account state when it succeeds. */
export function useAccountActions() {
  const { account } = useData()
  const reset = useResetAfter()
  if (!account) return null
  return {
    async signIn(email: string, password: string) {
      await account.signIn(email, password)
      await reset()
    },
    async signUp(email: string, password: string) {
      const result = await account.signUp(email, password)
      await reset()
      return result
    },
    resend: (email: string) => account.resendConfirmation(email),
    forgot: (email: string) => account.requestPasswordReset(email),
    async updatePassword(password: string) {
      await account.updatePassword(password)
      await reset()
    },
  }
}

export type AccountActions = NonNullable<ReturnType<typeof useAccountActions>>
