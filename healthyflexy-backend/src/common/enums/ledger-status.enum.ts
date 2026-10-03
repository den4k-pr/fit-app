/** Статус запису: earn завжди confirmed; settlement проходить pending → confirmed | rejected. */
export enum LedgerStatus {
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
  REJECTED = 'rejected',
}
