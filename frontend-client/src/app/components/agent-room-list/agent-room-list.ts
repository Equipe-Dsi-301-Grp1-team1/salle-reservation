import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AgentRoomService, Room } from '../../services/agent-room';

@Component({
  selector: 'app-agent-room-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './agent-room-list.html'
})
export class AgentRoomListComponent implements OnInit {
  rooms: Room[] = [];
  successMessage = '';
  errorMessage = '';
  loading = false;

  constructor(
    private roomService: AgentRoomService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading = true;
    this.roomService.getMyRooms().subscribe({
      next: (data) => {
        this.rooms = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur API getMyRooms:', err);
        this.errorMessage = err.error?.message || 'Impossible de charger vos salles.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onDelete(room: Room): void {
    if (!room._id) return;
    const confirmed = confirm(`Voulez-vous vraiment supprimer la salle "${room.name}" ?`);
    if (!confirmed) return;

    this.successMessage = '';
    this.errorMessage = '';

    this.roomService.deleteRoom(room._id).subscribe({
      next: (res) => {
        this.successMessage = res.message;
        this.rooms = this.rooms.filter((r) => r._id !== room._id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de la suppression.';
        this.cdr.detectChanges();
      }
    });
  }
}