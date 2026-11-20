import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);
  nom = '';
  email = '';
  password = '';
  message = '';
  erreur = '';
  inscrire(): void {
    this.message = '';
    this.erreur = '';
    this.authService.register({
      nom: this.nom,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response) => {
        this.message = response.message;
        this.nom = '';
        this.email = '';
        this.password = '';
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (error) => {
        this.erreur = error.error?.message || 'Erreur lors de l’inscription';
      }
    });
  }
}
