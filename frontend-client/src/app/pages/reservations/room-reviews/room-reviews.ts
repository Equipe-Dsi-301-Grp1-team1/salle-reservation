import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { BookingService, RoomReviews } from '../../../services/booking';

@Component({
    selector: 'app-room-reviews',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './room-reviews.html',
    styleUrl: './room-reviews.css'
})
export class RoomReviewsComponent implements OnInit {
    @Input() roomId = '';

    private route = inject(ActivatedRoute);
    private bookingService = inject(BookingService);

    reviews: RoomReviews | null = null;
    erreur = '';

    ngOnInit(): void {
        if (!this.roomId) {
            this.roomId = this.route.snapshot.paramMap.get('roomId') || '';
        }
        if (!this.roomId) {
            this.erreur = 'Aucune salle choisie.';
            return;
        }

        this.bookingService.getRoomReviews(this.roomId).subscribe({
            next: (reviews) => {
                this.reviews = reviews;
            },
            error: (error) => {
                this.erreur = error.error?.message || 'Impossible de charger les avis.';
            }
        });
    }

    etoiles(note: number): string {
        return '★'.repeat(note);
    }
}
