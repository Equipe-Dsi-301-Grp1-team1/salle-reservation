import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './register.html',
    styleUrl: './register.css'
})
export class Register {
    nom = '';
    email = '';
    password = '';
    confirmPassword = '';
    message = '';
    errorMessage = '';
    loading = false;
    constructor(private authService: AuthService) { }
    register(): void {
        this.message = '';
        this.errorMessage = '';
        if (!this.nom.trim() || !this.email.trim() || !this.password || !this.confirmPassword) {
            this.errorMessage = 'Tous les champs sont obligatoires';
            return;
        }
        if (this.password.length < 8) {
            this.errorMessage = 'Le mot de passe doit contenir au moins 8 caracteres';
            return;
        }
        if (this.password !== this.confirmPassword) {
            this.errorMessage = 'Les mots de passe ne correspondent pas';
            return;
        }
        this.loading = true;
        this.authService.register({
            nom: this.nom.trim(),
            email: this.email.trim(),
            password: this.password
        }).subscribe({
            next: (response) => {
                this.message = response.message;
                this.nom = '';
                this.email = '';
                this.password = '';
                this.confirmPassword = '';
                this.loading = false;
            },
            error: (error) => {
                this.errorMessage = error.error?.message || 'Une erreur est survenue';
                this.loading = false;
            }
        });
    }
}