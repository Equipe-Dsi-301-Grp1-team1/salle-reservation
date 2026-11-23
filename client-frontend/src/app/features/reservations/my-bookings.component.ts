import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { Booking, Page } from '../../core/models';
import { dayNumber, formatDeadline, monthShort } from '../../shared/dates';
import { EuroPipe } from '../../shared/euro.pipe';
import { UiBadgeComponent } from '../../shared/ui-badge.component';
import { UiChipComponent } from '../../shared/ui-chip.component';
import { UiModalComponent } from '../../shared/ui-modal.component';
import { UiPaginationComponent } from '../../shared/ui-pagination.component';
import { BookingService } from './booking.service';

const FILTERS = [
  { key: '', label: 'Toutes' }, { key: 'PENDING', label: 'En attente' }, { key: 'VALIDATED', label: 'Validées' },
  { key: 'PAID', label: 'Payées' }, { key: 'REJECTED', label: 'Refusées' }, { key: 'CANCELLED', label: 'Annulées' },
];

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [RouterLink, EuroPipe, UiBadgeComponent, UiChipComponent, UiModalComponent, UiPaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <div class="page-head"><h1>Mes réservations</h1><p>Suivez vos demandes et payez celles que l’agent a validées.</p></div>
      <div class="row chips" role="group" aria-label="Filtrer par statut">
        @for (f of filters; track f.key) {
          <ui-chip [selected]="status() === f.key" (click)="setStatus(f.key)">{{ f.label }}</ui-chip>
        }
      </div>
      @if (message()) { <div class="alert alert-success" role="status">{{ message() }}</div> }
      @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }

      @if (loading()) {
        <div class="card skeleton" style="height:96px"></div>
      } @else if (!data()?.items?.length) {
        <div class="card empty"><h3>Aucune réservation</h3><p>Trouvez une salle et envoyez votre première demande.</p><a routerLink="/salles" class="btn btn-primary">Voir les salles</a></div>
      } @else {
        <ul class="list">
          @for (b of data()!.items; track b.id) {
            <li class="card item">
              <div class="date" aria-hidden="true"><strong>{{ day(b.date) }}</strong><span>{{ month(b.date) }}</span></div>
              <div class="info">
                <a [routerLink]="['/reservations', b.id]" class="name">{{ b.room.name }}</a>
                <div class="muted">{{ b.hours }} h · {{ b.guests }} invités · {{ b.eventType }}</div>
                @if (b.status === 'REJECTED' && b.rejectionReason) { <div class="reason">Motif : {{ b.rejectionReason }}</div> }
                @if (b.canPay && b.hoursLeftToPay) { <div class="warn">À payer sous {{ b.hoursLeftToPay }} h</div> }
              </div>
              <div class="amount">{{ b.amountCents | euro }}</div>
              <ui-badge [status]="b.status" />
              <div class="actions">
                @if (b.canPay) { <a [routerLink]="['/paiement', b.id]" class="btn btn-primary btn-sm">Payer {{ b.amountCents | euro }}</a> }
                @if (b.status === 'PAID' || b.status === 'COMPLETED') { <button type="button" class="btn btn-ghost btn-sm" (click)="receipt(b)">Reçu PDF</button> }
                @if (b.canCancel) { <button type="button" class="btn btn-danger btn-sm" (click)="toCancel.set(b)">Annuler</button> }
              </div>
            </li>
          }
        </ul>
        <ui-pagination [page]="data()!.page" [totalPages]="data()!.totalPages" (pageChange)="load($event)" />
      }
    </div>

    <ui-modal [open]="!!toCancel()" title="Annuler cette réservation ?" confirmLabel="Oui, annuler" cancelLabel="Retour" [danger]="true" [busy]="busy()" (confirmed)="confirmCancel()" (closed)="toCancel.set(null)">
      <p>L’annulation n’est possible que plus de 7 jours avant l’événement. Aucun remboursement automatique n’est effectué.</p>
    </ui-modal>
  `,
  styles: `
    .chips { margin-bottom: 18px; } .list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
    .item { display: flex; align-items: center; gap: 16px; padding: 16px; flex-wrap: wrap; }
    .date { width: 56px; text-align: center; background: var(--violet-light); color: var(--violet-dark); border-radius: 12px; padding: 8px 0; display: flex; flex-direction: column; }
    .date strong { font-size: 1.3rem; } .info { flex: 1; min-width: 180px; } .name { font-weight: 700; color: var(--ink); text-decoration: none; }
    .amount { font-weight: 700; } .actions { display: flex; gap: 8px; flex-wrap: wrap; } .reason { color: var(--red); font-size: .9rem; } .warn { color: var(--amber-ink); font-size: .9rem; font-weight: 600; }
  `,
})
export class MyBookingsComponent {
  private readonly bookings = inject(BookingService);
  readonly filters = FILTERS;
  readonly status = signal('');
  readonly data = signal<Page<Booking> | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly message = signal('');
  readonly toCancel = signal<Booking | null>(null);
  readonly busy = signal(false);
  readonly day = (d: string) => dayNumber(d);
  readonly month = (d: string) => monthShort(d);
  readonly deadline = formatDeadline;

  constructor() { this.load(1); }

  setStatus(s: string): void { this.status.set(s); this.load(1); }

  load(page: number): void {
    this.loading.set(true);
    this.bookings.mine(this.status() || undefined, page).subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); this.error.set(''); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
    });
  }

  confirmCancel(): void {
    const b = this.toCancel();
    if (!b) return;
    this.busy.set(true);
    this.bookings.cancel(b.id).subscribe({
      next: () => { this.busy.set(false); this.toCancel.set(null); this.message.set('Votre réservation a été annulée.'); this.load(this.data()?.page ?? 1); },
      error: (e) => { this.busy.set(false); this.toCancel.set(null); this.error.set(errorMessage(e)); },
    });
  }

  receipt(b: Booking): void {
    this.bookings.downloadReceipt(b.id).subscribe({ error: (e) => this.error.set(errorMessage(e)) });
  }
}
