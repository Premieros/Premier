import { describe, expect, it } from 'vitest';
import { computeLineDiscount, computePosTotals } from '@/lib/posMath';

describe('POS calculation action contracts', () => {
  it('calculates line discounts independently of UI position', () => {
    expect(computeLineDiscount(100, 10)).toBe(10);
    expect(computeLineDiscount(100, 150)).toBe(100);
  });

  it('keeps totals deterministic for cart, discount, tax and payment', () => {
    const totals = computePosTotals({
      items: [
        { product: { id: 'p1', sale_price: 100 } as never, unit_name: 'piece', quantity: 2, unit_price: 100, discount_amount: 0, bonus_quantity: 0 },
        { product: { id: 'p2', sale_price: 50 } as never, unit_name: 'piece', quantity: 1, unit_price: 50, discount_amount: 5, bonus_quantity: 0 },
      ],
      discountType: 'amount',
      discountAmount: 10,
      taxRate: 14,
      taxEnabled: true,
      paidAmount: 250,
      paymentMethod: 'cash',
    });

    expect(totals.subtotal).toBe(245);
    expect(totals.discountValue).toBe(15);
    expect(totals.taxAmount).toBe(32.2);
    expect(totals.total).toBe(262.2);
    expect(totals.change).toBe(0);
  });
});
