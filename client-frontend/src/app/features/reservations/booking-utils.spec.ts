import { bookingSummary, hasReceipt, payDeadlineLabel } from './booking-utils';

describe('booking-utils', () => {
  it('résume une réservation', () => {
    expect(bookingSummary({ hours: 10, guests: 85, eventType: 'Mariage' })).toBe('10 h · 85 invités · Mariage');
    expect(bookingSummary({ hours: 1, guests: 1, eventType: 'Atelier' })).toBe('1 h · 1 invité · Atelier');
  });
  it('affiche le délai de paiement seulement si canPay', () => {
    expect(payDeadlineLabel({ canPay: true, hoursLeftToPay: 35.2 })).toBe('À payer sous 36 h');
    expect(payDeadlineLabel({ canPay: false, hoursLeftToPay: 35 })).toBe('');
  });
  it('reçu pour PAID et COMPLETED', () => {
    expect(hasReceipt({ status: 'PAID' })).toBeTrue();
    expect(hasReceipt({ status: 'PENDING' })).toBeFalse();
  });
});
