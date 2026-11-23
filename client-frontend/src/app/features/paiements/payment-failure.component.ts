import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-failure',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container page narrow">
      <div class="card pad center">
        <h1>Le paiement n’a pas abouti</h1>
        <p class="muted">Aucun montant n’a été débité. Vous pouvez réessayer tant que le délai de paiement n’est pas dépassé.</p>
        <div class="row" style="justify-content:center">
          @if (id) { <a [routerLink]="['/paiement', id]" class="btn btn-primary">Réessayer</a> }
          <a routerLink="/reservations" class="btn btn-ghost">Mes réservations</a>
        </div>
      </div>
    </div>
  `,
  styles: `.narrow { max-width: 560px; } .pad { padding: 32px 24px; } .center { text-align: center; }`,
})
export class PaymentFailureComponent {
  readonly id = inject(ActivatedRoute).snapshot.queryParamMap.get('booking') ?? '';
}
