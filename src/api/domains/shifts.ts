import type { ApiResult } from '../types';
import type { RpcResult } from '@/lib/types';
import { rpc } from '../rpc';

export const shifts = {
  open(p: { p_branch_id: string; p_opening_amount: number; p_notes: string | null }): ApiResult<RpcResult> { return rpc('open_shift', p); },
  close(p: { p_shift_id: string; p_actual_amount: number; p_notes: string | null }): ApiResult<RpcResult> { return rpc('close_shift', p); },
};
