/** Після входу підключає socket.io (`services/realtime/socket`) і на події інвалідує запити: session.updated → today/calendar/parent-status; ledger.updated → ledger/stats; family.* → family/me. */
export function useRealtimeSync(): void {
  throw new Error('Not implemented: useRealtimeSync');
}
