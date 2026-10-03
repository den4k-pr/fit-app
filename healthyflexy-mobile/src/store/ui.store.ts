import { create } from 'zustand';

/** Тост зі знизу («Календар збережено ✓»). Один активний тост; новий замінює попередній. */
interface UiState {
  toast: { id: number; message: string } | null;
  showToast: (message: string) => void;
  hideToast: () => void;
}

let toastSeq = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
const TOAST_DURATION_MS = 2800;

export const useUiStore = create<UiState>((set) => ({
  toast: null,
  showToast: (message) => {
    if (toastTimer) clearTimeout(toastTimer);
    toastSeq += 1;
    set({ toast: { id: toastSeq, message } });
    toastTimer = setTimeout(() => set({ toast: null }), TOAST_DURATION_MS);
  },
  hideToast: () => set({ toast: null }),
}));

/** Виклик поза React (у хуках-мутаціях): `showToast('...')` */
export const showToast = (message: string): void => useUiStore.getState().showToast(message);
