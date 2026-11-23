import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api-error';
import { PaymentRow } from '../../core/models';
import { formatDateTime, formatShortDate } from '../../shared/dates';
import { EuroPipe } from '../../shared/euro.pipe';
import { PaymentService } from './payment.service';

const LABELS: Record<string, string> = { pending: 'En attente', succeeded: 'Réussi', failed: 'Échoué' };

@Component({
  selector: 'app-payments-history',
  standalone: true,
  imports: [RouterLink, EuroPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page">
      <div class="page-head"><h1>Mes paiements</h1><p>L’historique de ce que vous avez payé.</p></div>
      @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
      @else if (loading()) { <div class="card skeleton" style="height:180px"></div> }
      @else if (!rows().length) {
        <div class="card empty"><h3>Aucun paiement pour le moment</h3><p>Vos paiements apparaîtront ici.</p><a routerLink="/reservations" class="btn btn-primary">Mes réservations</a></div>
      } @else {
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Salle</th><th>Date de l’événement</th><th>Montant</th><th>Statut</th><th>Payé le</th></tr></thead>
            <tbody>
              @for (p of rows(); track p.id) {
                <tr>
                  <td><a [routerLink]="['/reservations', p.bookingId]">{{ p.roomName }}</a></td>
                  <td>{{ day(p.date) }}</td>
                  <td><strong>{{ p.amountCents | euro }}</strong></td>
                  <td>{{ label(p.status) }}</td>
                  <td>{{ p.paidAt ? dateTime(p.paidAt) : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .table-wrap { overflow-x: auto; } table { width: 100%; border-collapse: collapse; min-width: 560px; }
    th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--line); } th { color: var(--muted); font-size: .85rem; }
  `,
})
export class PaymentsHistoryComponent {
  private readonly payments = inject(PaymentService);
  readonly rows = signal<PaymentRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly day = formatShortDate;
  readonly dateTime = formatDateTime;
  readonly label = (s: string) => LABELS[s] ?? s;

  constructor() {
    this.payments.mine().subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: (e) => { this.error.set(errorMessage(e)); this.loading.set(false); },
    });
  }
}
