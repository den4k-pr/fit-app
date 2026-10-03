/** Стан трьох чекбоксів consent-екрана; кнопка «Продовжити» активна, лише коли всі true. */
export interface ConsentValue {
  terms: boolean;
  disclaimer: boolean;
  doctor: boolean;
}

export const EMPTY_CONSENT: ConsentValue = { terms: false, disclaimer: false, doctor: false };
export const isConsentComplete = (v: ConsentValue): boolean => v.terms && v.disclaimer && v.doctor;
