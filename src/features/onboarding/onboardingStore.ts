import { create } from 'zustand';

import type { SalaryFormOutput } from '@/features/profile/profileSchema';

type OnboardingDraft = {
  name: string;
  salary: SalaryFormOutput | null;
  setName: (name: string) => void;
  setSalary: (salary: SalaryFormOutput) => void;
  clear: () => void;
};

/** Borrador del onboarding: se guarda en la base recién al terminar. */
export const useOnboardingStore = create<OnboardingDraft>((set) => ({
  name: '',
  salary: null,
  setName: (name) => set({ name }),
  setSalary: (salary) => set({ salary }),
  clear: () => set({ name: '', salary: null }),
}));
