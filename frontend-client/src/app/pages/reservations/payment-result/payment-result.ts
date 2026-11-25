import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingService, ClientBooking } from '../../../services/booking';

@Component({
    selector: 'app-payment-result',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './payment-result.html',
    styleUrl: './payment-result.css'
})
export class PaymentResultComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private bookingService = inject(BookingService);

    booking: ClientBooking | null = null;
    succes = false;
    erreur = '';

    ngOnInit(): void {
        this.succes = this.route.snapshot.data['resultat'] === 'succes';
        this.charger();
    }

    charger(): void {
        const id = this.route.snapshot.paramMap.get('id') || '';
        this.bookingService.getOne(id).subscribe({
            next: (booking) => {
                this.booking = booking;
            },
            error: (error) => {
                this.erreur = error.error?.message || 'Réservation introuvable.';
            }
        });
    }
}
