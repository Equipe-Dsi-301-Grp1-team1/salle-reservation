import { Booking } from '../../core/models';

export function bookingSummary(b: Pick<Booking, 'hours' | 'guests' | 'eventType'>): string {
  return `${b.hours} h · ${b.guests} invité${b.guests > 1 ? 's' : ''} · ${b.eventType}`;
}

export function payDeadlineLabel(b: Pick<Booking, 'canPay' | 'hoursLeftToPay'>): string {
  if (!b.canPay || b.hoursLeftToPay === null || b.hoursLeftToPay === undefined) return '';
  return `À payer sous ${Math.max(1, Math.ceil(b.hoursLeftToPay))} h`;
}

export function hasReceipt(b: Pick<Booking, 'status'>): boolean {
  return b.status === 'PAID' || b.status === 'COMPLETED';
}
