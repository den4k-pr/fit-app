/**
 * socket.io-client: namespace `/realtime`, `auth: { token: accessToken }`.
 *   connectRealtime(): Socket   // авто-перепідключення; при 401 → refresh токена і reconnect
 *   disconnectRealtime(): void
 *   onRealtime<E extends RealtimeEvent>(event: E, handler: (p: RealtimePayloadMap[E]) => void): () => void
 */
export {};
