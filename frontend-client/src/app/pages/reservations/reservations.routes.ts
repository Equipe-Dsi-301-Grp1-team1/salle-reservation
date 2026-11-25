import { Routes } from '@angular/router';
import { ReservationFormComponent } from './reservation-form/reservation-form';
import { MyReservationsComponent } from './my-reservations/my-reservations';
import { ReservationDetailComponent } from './reservation-detail/reservation-detail';
import { PaymentPageComponent } from './payment/payment';
import { PaymentResultComponent } from './payment-result/payment-result';
import { MyPaymentsComponent } from './my-payments/my-payments';
import { ReviewFormComponent } from './review-form/review-form';
import { RoomReviewsComponent } from './room-reviews/room-reviews';

export const RESERVATION_ROUTES: Routes = [
    { path: '', component: MyReservationsComponent },
    { path: 'nouvelle', component: ReservationFormComponent },
    { path: 'mes-paiements', component: MyPaymentsComponent },
    { path: 'salle/:roomId', component: RoomReviewsComponent },
    { path: ':id/avis', component: ReviewFormComponent },
    { path: ':id/paiement/succes', component: PaymentResultComponent, data: { resultat: 'succes' } },
    { path: ':id/paiement/echec', component: PaymentResultComponent, data: { resultat: 'echec' } },
    { path: ':id/paiement', component: PaymentPageComponent },
    { path: ':id', component: ReservationDetailComponent }
];
