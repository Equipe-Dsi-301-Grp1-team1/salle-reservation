import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService, PaymentItem } from '../../../services/booking';

@Component({
    selector: 'app-my-payments',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './my-payments.html',
    styleUrl: './my-payments.css'
})
export class MyPaymentsComponent implements OnInit {
    private bookingService = inject(BookingService);

    payments: PaymentItem[] = [];
    erreur = '';
    chargement = true;

    ngOnInit(): void {
        this.bookingService.listPayments().subscribe({
            next: (payments) => {
                this.payments = payments;
                this.chargement = false;
            },
            error: (error) => {
                this.erreur = error.error?.message || 'Impossible de charger vos paiements.';
                this.chargement = false;
            }
        });
    }
}
