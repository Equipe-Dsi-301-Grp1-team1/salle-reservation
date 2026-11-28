import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingService, ClientBooking } from '../../../services/booking';

@Component({
    selector: 'app-payment-page',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './payment.html',
    styleUrl: './payment.css'
})
export class PaymentPageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private bookingService = inject(BookingService);

    booking: ClientBooking | null = null;
    erreur = '';
    message = '';
    chargement = false;

    ngOnInit(): void {
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

    payer(): void {
        if (!this.booking) {
            return;
        }

        this.erreur = '';
        this.message = '';
        this.chargement = true;

        this.bookingService.pay(this.booking.id).subscribe({
            next: (response) => {
                if (response.mode === 'stripe' && response.url) {
                    window.location.href = response.url;
                    return;
                }
                this.confirmerDemo();
            },
            error: (error) => {
                this.chargement = false;
                this.erreur = error.error?.message || 'Paiement impossible.';
            }
        });
    }

    private confirmerDemo(): void {
        if (!this.booking) {
            return;
        }

        this.bookingService.confirmDemoPayment(this.booking.id).subscribe({
            next: (response) => {
                this.chargement = false;
                this.message = response.message;
                this.router.navigate(['/reservations', this.booking!.id, 'paiement', 'succes']);
            },
            error: (error) => {
                this.chargement = false;
                this.erreur = error.error?.message || 'Paiement impossible.';
            }
        });
    }
}
