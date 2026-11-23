import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth.guard';

export const RESERVATIONS_ROUTES: Routes = [
  { path: '', canActivate: [authGuard], title: 'Mes réservations · EventSpace', loadComponent: () => import('./my-bookings.component').then((m) => m.MyBookingsComponent) },
  { path: ':id', canActivate: [authGuard], title: 'Réservation · EventSpace', loadComponent: () => import('./booking-detail.component').then((m) => m.BookingDetailComponent) },
];
