import { paymentStatusLabel, shouldKeepPolling } from './payment.service';

describe('payment helpers', () => {
  it('libellés français', () => {
    expect(paymentStatusLabel('pending')).toBe('En attente');
    expect(paymentStatusLabel('succeeded')).toBe('Réussi');
    expect(paymentStatusLabel('failed')).toBe('Échoué');
  });
  it('polling : continue tant que non payé et sous la limite', () => {
    expect(shouldKeepPolling('VALIDATED', 0)).toBeTrue();
    expect(shouldKeepPolling('PAID', 1)).toBeFalse();
    expect(shouldKeepPolling('VALIDATED', 10)).toBeFalse();
  });
});
