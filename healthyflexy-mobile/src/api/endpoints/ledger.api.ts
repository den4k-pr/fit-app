import { apiClient } from '../client';
import type {
  CreateFundDepositRequest,
  CreateSettlementRequest,
  FundDeposit,
  LedgerEntry,
  LedgerListQuery,
  LedgerListResponse,
  ResolveSettlementRequest,
} from '@/types';

export const ledgerApi = {
  list: (query: LedgerListQuery = {}) =>
    apiClient.get<LedgerListResponse>('/ledger', { params: query }).then((r) => r.data),
  createSettlement: (body: CreateSettlementRequest) =>
    apiClient.post<LedgerEntry>('/ledger/settlements', body).then((r) => r.data),
  /** Поповнити «Фонд» (лише спонсор) */
  createFundDeposit: (body: CreateFundDepositRequest) =>
    apiClient.post<FundDeposit>('/ledger/fund-deposits', body).then((r) => r.data),
  resolveSettlement: (id: string, body: ResolveSettlementRequest) =>
    apiClient.post<LedgerEntry>(`/ledger/settlements/${id}/resolve`, body).then((r) => r.data),
};
