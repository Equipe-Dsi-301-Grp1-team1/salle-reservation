import { Routes } from '@angular/router';
import { ReservationFormComponent } from './reservation-form/reservation-form';
import { MyReservationsComponent } from './my-reservations/my-reservations';

export const RESERVATION_ROUTES: Routes = [
    { path: '', component: MyReservationsComponent },
    { path: 'nouvelle', component: ReservationFormComponent }
];
