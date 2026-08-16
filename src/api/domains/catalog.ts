import type { ApiResult } from '../types';
import { rpc } from '../rpc';

export const catalog = { replaceProductUnits(p: { p_product_id: string; p_units: unknown }): ApiResult<null> { return rpc('replace_product_units', p); } };
