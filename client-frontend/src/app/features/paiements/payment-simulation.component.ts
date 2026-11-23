import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { Booking } from '../../core/models';
import { EuroPipe } from '../../shared/euro.pipe';
import { BookingService } from '../reservations/booking.service';
import { PaymentService } from './payment.service';

@Component({
  selector: 'app-payment-simulation',
  standalone: true,
  imports: [RouterLink, EuroPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page narrow">
      <div class="alert alert-warn" role="note"><strong>Mode démonstration</strong> — aucun vrai paiement n’est effectué.</div>
      <div class="card pad">
        <h1>Paiement sécurisé</h1>
        @if (booking(); as b) { <p class="muted">{{ b.room.name }}</p> }
        <div class="field"><label for="num">Numéro de carte</label><input id="num" class="input" value="4242 4242 4242 4242" readonly /></div>
        <div class="row">
          <div class="field" style="flex:1"><label for="exp">Expiration</label><input id="exp" class="input" value="12 / 34" readonly /></div>
          <div class="field" style="flex:1"><label for="cvc">CVC</label><input id="cvc" class="input" value="123" readonly /></div>
        </div>
        @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
        <button type="button" class="btn btn-primary btn-block" [disabled]="busy() || !session" (click)="pay()">
          {{ busy() ? 'Paiement en cours…' : 'Payer ' }}@if (!busy() && booking(); as b) { {{ b.amountCents | euro }} }
        </button>
        <p class="muted small"><a [routerLink]="['/paiement/echec']" [queryParams]="{ booking: bookingId() }">Annuler</a></p>
      </div>
    </div>
  `,
  styles: `.narrow { max-width: 480px; } .pad { padding: 24px; margin-top: 12px; } .small { font-size: .85rem; margin-top: 12px; }`,
})
export class PaymentSimulationComponent {
  readonly bookingId = input.required<string>();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookings = inject(BookingService);
  private readonly payments = inject(PaymentService);
  readonly session = this.route.snapshot.queryParamMap.get('session') ?? '';
  readonly booking = signal<Booking | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    queueMicrotask(() => this.bookings.get(this.bookingId()).subscribe({ next: (b) => this.booking.set(b), error: (e) => this.error.set(errorMessage(e)) }));
  }

  pay(): void {
    this.busy.set(true);
    this.error.set('');
    this.payments.simulate(this.session).subscribe({
      next: (r) => this.router.navigate(['/paiement/succes'], { queryParams: { booking: r.bookingId } }),
      error: (e) => { this.error.set(errorMessage(e)); this.busy.set(false); },
    });
  }
}
