import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth.guard';

export const PAIEMENTS_ROUTES: Routes = [
  { path: 'paiement/succes', canActivate: [authGuard], title: 'Paiement · EventSpace', loadComponent: () => import('./payment-success.component').then((m) => m.PaymentSuccessComponent) },
  { path: 'paiement/echec', canActivate: [authGuard], title: 'Paiement échoué · EventSpace', loadComponent: () => import('./payment-failure.component').then((m) => m.PaymentFailureComponent) },
  { path: 'paiement/simulation/:bookingId', canActivate: [authGuard], title: 'Paiement (démonstration) · EventSpace', loadComponent: () => import('./payment-simulation.component').then((m) => m.PaymentSimulationComponent) },
  { path: 'paiement/:bookingId', canActivate: [authGuard], title: 'Paiement · EventSpace', loadComponent: () => import('./payment-page.component').then((m) => m.PaymentPageComponent) },
  { path: 'paiements', canActivate: [authGuard], title: 'Mes paiements · EventSpace', loadComponent: () => import('./payments-history.component').then((m) => m.PaymentsHistoryComponent) },
];
