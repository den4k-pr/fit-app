import type { AppStateStatus } from 'react-native';

/** Підписка на AppState (foreground → refetch). */
export function useAppState(_onChange: (state: AppStateStatus) => void): void {
  throw new Error('Not implemented: useAppState');
}
