import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingService, ClientBooking } from '../../../services/booking';

@Component({
    selector: 'app-reservation-detail',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './reservation-detail.html',
    styleUrl: './reservation-detail.css'
})
export class ReservationDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private bookingService = inject(BookingService);

    booking: ClientBooking | null = null;
    erreur = '';
    message = '';

    ngOnInit(): void {
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

    telechargerRecu(): void {
        if (!this.booking) {
            return;
        }

        this.bookingService.downloadReceipt(this.booking.id).subscribe({
            next: (fichier) => {
                const url = window.URL.createObjectURL(fichier);
                const lien = document.createElement('a');
                lien.href = url;
                lien.download = 'recu-' + this.booking!.reference + '.pdf';
                lien.click();
                window.URL.revokeObjectURL(url);
            },
            error: () => {
                this.erreur = 'Impossible de télécharger le reçu.';
            }
        });
    }

    annuler(): void {
        if (!this.booking) {
            return;
        }
        if (!window.confirm('Annuler cette réservation ?')) {
            return;
        }

        this.erreur = '';
        this.message = '';
        this.bookingService.cancelBooking(this.booking.id).subscribe({
            next: (response) => {
                this.message = response.message;
                this.charger();
            },
            error: (error) => {
                this.erreur = error.error?.message || 'Annulation impossible.';
            }
        });
    }
}
