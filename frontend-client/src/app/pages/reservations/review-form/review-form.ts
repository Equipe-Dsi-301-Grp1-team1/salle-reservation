import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingService, ClientBooking } from '../../../services/booking';

@Component({
    selector: 'app-review-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './review-form.html',
    styleUrl: './review-form.css'
})
export class ReviewFormComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private bookingService = inject(BookingService);

    booking: ClientBooking | null = null;
    rating = 5;
    comment = '';
    erreur = '';
    message = '';
    envoi = false;

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

    envoyer(): void {
        if (!this.booking) {
            return;
        }

        this.erreur = '';
        this.envoi = true;

        this.bookingService.createReview(this.booking.id, {
            rating: this.rating,
            comment: this.comment
        }).subscribe({
            next: (response) => {
                this.envoi = false;
                this.message = response.message;
                setTimeout(() => {
                    this.router.navigate(['/reservations', this.booking!.id]);
                }, 1200);
            },
            error: (error) => {
                this.envoi = false;
                this.erreur = error.error?.message || 'Impossible d\'enregistrer l\'avis.';
            }
        });
    }
}
