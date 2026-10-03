import { create } from 'zustand';
import type { GuideRole } from './guide.slides';

/** Чи відкритий гайд зараз (відкривається автоматично першого разу або з «Профілю») */
interface GuideState {
  openFor: GuideRole | null;
  open: (role: GuideRole) => void;
  close: () => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  openFor: null,
  open: (role) => set({ openFor: role }),
  close: () => set({ openFor: null }),
}));
