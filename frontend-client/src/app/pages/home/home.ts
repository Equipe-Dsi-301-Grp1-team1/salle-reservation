import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  private authService = inject(AuthService);
  private router = inject(Router);
  user = JSON.parse(localStorage.getItem('user') || 'null');
  deconnecter(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
