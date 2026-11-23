import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { Booking } from '../../core/models';
import { formatDeadline, formatLongDate } from '../../shared/dates';
import { EuroPipe } from '../../shared/euro.pipe';
import { BookingService } from '../reservations/booking.service';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [RouterLink, EuroPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page narrow">
      @if (loading()) {
        <div class="card skeleton" style="height:260px"></div>
      } @else if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
        <a routerLink="/reservations" class="btn btn-ghost">Mes réservations</a>
      } @else if (booking()) { @let b = booking()!;
        <div class="page-head"><h1>Paiement sécurisé</h1><p>Traité par Stripe (mode test)</p></div>
        <div class="card pad">
          <h2>{{ b.room.name }}</h2>
          <p class="muted">{{ longDate(b.date) }} · {{ b.guests }} invités · {{ b.eventType }}</p>
          <div class="line"><span>{{ b.hourlyPriceCents | euro }} × {{ b.hours }} h</span><strong>{{ b.amountCents | euro }}</strong></div>
          <div class="line total"><span>Total à payer</span><strong>{{ b.amountCents | euro }}</strong></div>
          @if (b.canPay && b.expiresAt) {
            <p class="alert alert-warn">Payez avant le {{ deadline(b.expiresAt) }}, sinon la réservation expire.</p>
            @if (payError()) { <p class="alert alert-error" role="alert">{{ payError() }}</p> }
            <button type="button" class="btn btn-primary btn-block" [disabled]="paying()" (click)="pay(b)">
              {{ paying() ? 'Redirection…' : 'Payer ' }}@if (!paying()) { {{ b.amountCents | euro }} }
            </button>
            <p class="muted small">Vous serez prévenu par e-mail dès que le paiement est confirmé.</p>
          } @else {
            <p class="alert alert-info">
              @switch (b.status) {
                @case ('PAID') { Cette réservation est déjà payée. }
                @case ('PENDING') { L’agent n’a pas encore validé votre demande : le paiement sera possible après validation. }
                @case ('VALIDATED') { Le délai de paiement est dépassé. }
                @default { Cette réservation ne peut plus être payée ({{ b.statusLabel }}). }
              }
            </p>
            <a routerLink="/reservations" class="btn btn-ghost">Mes réservations</a>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .narrow { max-width: 560px; } .pad { padding: 24px; }
    .line { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--line); }
    .total { font-size: 1.2rem; border-bottom: 0; margin-bottom: 12px; } .small { font-size: .85rem; margin-top: 12px; }
  `,
})
export class PaymentPageComponent {
  readonly bookingId = input.required<string>({ alias: 'bookingId' });
  private readonly bookings = inject(BookingService);
  readonly booking = signal<Booking | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly paying = signal(false);
  readonly payError = signal('');
  readonly longDate = formatLongDate;
  readonly deadline = formatDeadline;

  constructor() {
    queueMicrotask(() =>
      this.bookings.get(this.bookingId()).subscribe({
        next: (b) => { this.booking.set(b); this.loading.set(false); },
        error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
      }),
    );
  }

  pay(b: Booking): void {
    this.paying.set(true);
    this.payError.set('');
    this.bookings.pay(b.id).subscribe({
      next: (r) => { window.location.href = r.url; },
      error: (e) => { this.payError.set(errorMessage(e)); this.paying.set(false); },
    });
  }
}
