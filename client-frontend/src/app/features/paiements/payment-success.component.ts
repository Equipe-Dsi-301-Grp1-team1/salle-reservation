import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { Booking } from '../../core/models';
import { UiBadgeComponent } from '../../shared/ui-badge.component';
import { BookingService } from '../reservations/booking.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [RouterLink, UiBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page narrow">
      <div class="card pad center">
        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        } @else if (booking()?.status === 'PAID' || booking()?.status === 'COMPLETED') {
          <h1>Votre réservation est payée</h1>
          <p><ui-badge status="PAID" /></p>
          <p class="muted">{{ booking()!.room.name }} — un e-mail de confirmation vous a été envoyé.</p>
          <div class="row" style="justify-content:center">
            <button type="button" class="btn btn-ghost" (click)="receipt()">Reçu PDF</button>
            <a routerLink="/reservations" class="btn btn-primary">Mes réservations</a>
          </div>
        } @else {
          <h1>Paiement en cours de confirmation…</h1>
          <p class="muted" role="status">Le statut se met à jour automatiquement dès que Stripe confirme le paiement. Vous pouvez quitter cette page.</p>
          @if (timedOut()) { <p class="alert alert-info">La confirmation prend plus de temps que prévu. Consultez <a routerLink="/reservations">vos réservations</a> dans un instant.</p> }
        }
      </div>
    </div>
  `,
  styles: `.narrow { max-width: 560px; } .pad { padding: 32px 24px; } .center { text-align: center; }`,
})
export class PaymentSuccessComponent {
  private readonly bookings = inject(BookingService);
  private readonly id = inject(ActivatedRoute).snapshot.queryParamMap.get('booking') ?? '';
  readonly booking = signal<Booking | null>(null);
  readonly error = signal('');
  readonly timedOut = signal(false);
  private tries = 0;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    if (!this.id) this.error.set('Réservation introuvable.');
    else this.poll();
  }

  private poll(): void {
    this.bookings.get(this.id).subscribe({
      next: (b) => {
        this.booking.set(b);
        if (b.status === 'PAID' || b.status === 'COMPLETED') return;
        this.tries += 1;
        if (this.tries >= 10) { this.timedOut.set(true); return; }
        this.timer = setTimeout(() => this.poll(), 2000);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }

  receipt(): void {
    this.bookings.downloadReceipt(this.id).subscribe({ error: (e) => this.error.set(errorMessage(e)) });
  }
}
