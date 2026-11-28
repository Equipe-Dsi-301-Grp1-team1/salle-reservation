import { Routes } from '@angular/router';
import { ReservationFormComponent } from './reservation-form/reservation-form';

export const RESERVATION_ROUTES: Routes = [
    { path: 'nouvelle', component: ReservationFormComponent }
];
