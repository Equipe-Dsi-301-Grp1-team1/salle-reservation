import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingService, RoomInfo } from '../../../services/booking';
import { totalPrice, formatEuros } from '../price';

@Component({
    selector: 'app-reservation-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './reservation-form.html',
    styleUrl: './reservation-form.css'
})
export class ReservationFormComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private bookingService = inject(BookingService);

    room: RoomInfo | null = null;
    roomId = '';
    date = '';
    hours = 2;
    guests = 1;
    eventType = '';
    heures = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    typesEvenement = ['Mariage', 'Anniversaire', 'Réunion', 'Séminaire', 'Conférence', 'Autre'];
    erreur = '';
    message = '';
    reference = '';
    envoi = false;

    ngOnInit(): void {
        this.roomId = this.route.snapshot.queryParamMap.get('roomId') || '';
        this.date = this.route.snapshot.queryParamMap.get('date') || '';

        if (!this.roomId) {
            this.erreur = 'Aucune salle choisie.';
            return;
        }

        this.bookingService.getRoomInfo(this.roomId).subscribe({
            next: (room) => {
                this.room = room;
            },
            error: (error) => {
                this.erreur = error.error?.message || 'Impossible de charger la salle.';
            }
        });
    }

    get total(): number {
        if (!this.room) {
            return 0;
        }
        return totalPrice(this.room.pricePerHour, this.hours);
    }

    get totalAffiche(): string {
        return formatEuros(this.total);
    }

    envoyer(): void {
        this.erreur = '';
        this.message = '';
        this.envoi = true;

        this.bookingService.createBooking({
            roomId: this.roomId,
            date: this.date,
            hours: this.hours,
            guests: this.guests,
            eventType: this.eventType
        }).subscribe({
            next: (response) => {
                this.envoi = false;
                this.message = response.message;
                this.reference = response.booking.reference;
            },
            error: (error) => {
                this.envoi = false;
                this.erreur = error.error?.message || 'Erreur lors de l\'envoi de la demande.';
            }
        });
    }
}
