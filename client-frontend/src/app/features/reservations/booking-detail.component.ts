import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { Booking } from '../../core/models';
import { formatDateTime, formatDeadline, formatLongDate } from '../../shared/dates';
import { EuroPipe } from '../../shared/euro.pipe';
import { UiBadgeComponent } from '../../shared/ui-badge.component';
import { UiModalComponent } from '../../shared/ui-modal.component';
import { ReviewFormComponent } from '../avis/review-form.component';
import { BookingService } from './booking.service';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [RouterLink, EuroPipe, UiBadgeComponent, UiModalComponent, ReviewFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page narrow">
      <a routerLink="/reservations" class="muted">← Mes réservations</a>
      @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
      @if (loading()) { <div class="card skeleton" style="height:300px;margin-top:12px"></div> }
      @else if (booking()) { @let b = booking()!;
        <div class="card pad">
          <div class="row"><h1>{{ b.room.name }}</h1><span class="spacer"></span><ui-badge [status]="b.status" /></div>
          <p class="muted">{{ b.room.address }}</p>
          <dl>
            <dt>Date</dt><dd>{{ longDate(b.date) }}</dd>
            <dt>Durée</dt><dd>{{ b.hours }} h</dd>
            <dt>Invités</dt><dd>{{ b.guests }}</dd>
            <dt>Événement</dt><dd>{{ b.eventType }}</dd>
            <dt>Calcul</dt><dd>{{ b.hourlyPriceCents | euro }} × {{ b.hours }} h</dd>
            <dt>Total</dt><dd><strong>{{ b.amountCents | euro }}</strong></dd>
            <dt>Demande envoyée</dt><dd>{{ dateTime(b.createdAt) }}</dd>
          </dl>
          @if (b.status === 'REJECTED') { <div class="alert alert-error">Motif du refus : {{ b.rejectionReason }}</div> }
          @if (b.canPay && b.expiresAt) { <div class="alert alert-warn">À payer avant le {{ deadline(b.expiresAt) }} (il reste environ {{ b.hoursLeftToPay }} h).</div> }
          @if (b.status === 'PENDING') { <div class="alert alert-info">En attente de la décision de l’agent. Vous payez seulement après sa validation.</div> }
          <div class="row">
            @if (b.canPay) { <a [routerLink]="['/paiement', b.id]" class="btn btn-primary">Payer {{ b.amountCents | euro }}</a> }
            @if (b.status === 'PAID' || b.status === 'COMPLETED') { <button type="button" class="btn btn-ghost" (click)="receipt(b)">Reçu PDF</button> }
            @if (b.canCancel) { <button type="button" class="btn btn-danger" (click)="confirm.set(true)">Annuler la réservation</button> }
          </div>
          @if (!b.canCancel && (b.status === 'PENDING' || b.status === 'VALIDATED' || b.status === 'PAID')) {
            <p class="muted small">L’annulation n’est plus possible à moins de 7 jours de l’événement.</p>
          }
        </div>
        @if (b.status === 'COMPLETED') {
          <div class="card pad">
            @if (b.hasReview || reviewed()) { <p>Merci pour votre avis !</p> }
            @else { <h2>Donnez votre avis</h2><app-review-form [bookingId]="b.id" (submitted)="reviewed.set(true)" /> }
          </div>
        }
      }
    </div>
    <ui-modal [open]="confirm()" title="Annuler cette réservation ?" confirmLabel="Oui, annuler" [danger]="true" [busy]="busy()" (confirmed)="cancel()" (closed)="confirm.set(false)">
      <p>Aucun remboursement automatique n’est effectué. Cette action est définitive.</p>
    </ui-modal>
  `,
  styles: `
    .narrow { max-width: 680px; } .pad { padding: 24px; margin-top: 12px; display: block; }
    dl { display: grid; grid-template-columns: 160px 1fr; gap: 8px 12px; } dt { color: var(--muted); } dd { margin: 0; } .small { font-size: .85rem; }
  `,
})
export class BookingDetailComponent {
  readonly id = input.required<string>();
  private readonly bookings = inject(BookingService);
  readonly booking = signal<Booking | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly confirm = signal(false);
  readonly busy = signal(false);
  readonly reviewed = signal(false);
  readonly longDate = formatLongDate;
  readonly deadline = formatDeadline;
  readonly dateTime = formatDateTime;

  constructor() { queueMicrotask(() => this.load()); }

  private load(): void {
    this.bookings.get(this.id()).subscribe({
      next: (b) => { this.booking.set(b); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
    });
  }

  cancel(): void {
    this.busy.set(true);
    this.bookings.cancel(this.id()).subscribe({
      next: (b) => { this.booking.set(b); this.busy.set(false); this.confirm.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.busy.set(false); this.confirm.set(false); },
    });
  }

  receipt(b: Booking): void {
    this.bookings.downloadReceipt(b.id).subscribe({ error: (e) => this.error.set(errorMessage(e)) });
  }
}
