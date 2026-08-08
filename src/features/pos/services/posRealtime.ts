import { supabase } from '@/api';

export interface PosRealtimeOptions {
  branchId: string;
  onEvent: () => void;
  debounceMs?: number;
}

export function subscribePosRealtime({ branchId, onEvent, debounceMs = 300 }: PosRealtimeOptions): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const trigger = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => onEvent(), debounceMs);
  };

  const channel = supabase
    .channel(`pos-realtime-${branchId}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` }, trigger)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dining_tables', filter: `branch_id=eq.${branchId}` }, trigger)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, trigger)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_kitchen_sends', filter: `branch_id=eq.${branchId}` }, trigger)
    .subscribe();

  return () => {
    if (timer) clearTimeout(timer);
    supabase.removeChannel(channel);
  };
}
