import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/api/gateway';
import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/api/query-keys';
import type { CreateInviteRequest, Invite } from '@/types';

/** POST /families/invites: нове запрошення знецінює попереднє */
export function useCreateInvite(): UseMutationResult<Invite, ApiError, CreateInviteRequest> {
  const queryClient = useQueryClient();
  return useMutation<Invite, ApiError, CreateInviteRequest>({
    mutationFn: (body) => api.families.createInvite(body),
    onSuccess: (invite) => queryClient.setQueryData(queryKeys.family.activeInvite(), invite),
  });
}
