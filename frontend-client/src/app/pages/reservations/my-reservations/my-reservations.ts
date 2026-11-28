import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService, Booking } from '../../../services/booking';

@Component({
    selector: 'app-my-reservations',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './my-reservations.html',
    styleUrl: './my-reservations.css'
})
export class MyReservationsComponent implements OnInit {
    private bookingService = inject(BookingService);

    bookings: Booking[] = [];
    status = '';
    erreur = '';
    chargement = true;

    statuts = [
        { valeur: '', label: 'Toutes' },
        { valeur: 'EN_ATTENTE', label: 'En attente' },
        { valeur: 'VALIDEE', label: 'Validées' },
        { valeur: 'PAYEE', label: 'Payées' },
        { valeur: 'REFUSEE', label: 'Refusées' }
    ];

    ngOnInit(): void {
        this.charger();
    }

    charger(): void {
        this.chargement = true;
        this.bookingService.listMine(this.status).subscribe({
            next: (bookings) => {
                this.bookings = bookings;
                this.chargement = false;
            },
            error: (error) => {
                this.erreur = error.error?.message || 'Impossible de charger vos réservations.';
                this.chargement = false;
            }
        });
    }

    filtrer(status: string): void {
        this.status = status;
        this.charger();
    }

    nomSalle(booking: Booking): string {
        if (typeof booking.roomId === 'string') {
            return 'Salle';
        }
        return booking.roomId.name;
    }

    libelleStatut(status: string): string {
        const labels: { [key: string]: string } = {
            EN_ATTENTE: 'En attente',
            VALIDEE: 'Validée',
            PAYEE: 'Payée',
            REFUSEE: 'Refusée',
            EXPIREE: 'Expirée',
            ANNULEE: 'Annulée',
            TERMINEE: 'Terminée'
        };
        return labels[status] || status;
    }
}
