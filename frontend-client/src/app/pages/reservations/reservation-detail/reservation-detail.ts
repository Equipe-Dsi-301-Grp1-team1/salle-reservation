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
}
