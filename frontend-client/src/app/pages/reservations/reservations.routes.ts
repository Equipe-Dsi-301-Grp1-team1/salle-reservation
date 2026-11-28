import { Routes } from '@angular/router';
import { ReservationFormComponent } from './reservation-form/reservation-form';
import { MyReservationsComponent } from './my-reservations/my-reservations';
import { ReservationDetailComponent } from './reservation-detail/reservation-detail';

export const RESERVATION_ROUTES: Routes = [
    { path: '', component: MyReservationsComponent },
    { path: 'nouvelle', component: ReservationFormComponent },
    { path: ':id', component: ReservationDetailComponent }
];
