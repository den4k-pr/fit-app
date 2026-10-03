import { Equals } from 'class-validator';

/**
 * POST /users/me/consent: фіксує згоду з consent-екрана (розділ 5.2).
 * Усі три чекбокси обов'язкові, тому приймаємо лише `true`.
 */
export class AcceptConsentDto {
  /** «Погоджуюсь з Умовами використання та Політикою конфіденційності» */
  @Equals(true)
  termsAndPrivacyAccepted: true;

  /** «Розумію, що застосунок не є медичною рекомендацією» */
  @Equals(true)
  disclaimerAccepted: true;

  /** «Батько/мати проконсультувалися з лікарем» */
  @Equals(true)
  doctorConsultationConfirmed: true;
}
