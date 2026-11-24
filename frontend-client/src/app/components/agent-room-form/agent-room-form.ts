import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AgentRoomService } from '../../services/agent-room';

@Component({
  selector: 'app-agent-room-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './agent-room-form.html'
})
export class AgentRoomFormComponent implements OnInit {
  roomForm!: FormGroup;
  isEditMode = false;
  roomId: string | null = null;
  availableEquipments: string[] = [];
  selectedEquipments: string[] = [];
  successMessage = '';
  errorMessage = '';

  // Libellés lisibles en français pour l'affichage (BNF-11)
  equipmentLabels: Record<string, string> = {
    wifi: 'Wi-Fi haut débit',
    videoprojecteur: 'Vidéoprojecteur',
    climatisation: 'Climatisation',
    sonorisation: 'Sonorisation',
    tableau_blanc: 'Tableau blanc',
    parking: 'Parking',
    cuisine: 'Espace cuisine'
  };

  constructor(
    private fb: FormBuilder,
    private roomService: AgentRoomService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.roomForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      address: ['', [Validators.required]],
      capacity: [10, [Validators.required, Validators.min(1)]],
      pricePerHour: [50, [Validators.required, Validators.min(1)]]
    });

    this.roomService.getAllowedEquipments().subscribe({
      next: (list) => (this.availableEquipments = list)
    });

    this.roomId = this.route.snapshot.paramMap.get('id');
    if (this.roomId) {
      this.isEditMode = true;
      this.roomService.getRoomById(this.roomId).subscribe({
        next: (room) => {
          this.roomForm.patchValue({
            name: room.name,
            description: room.description,
            address: room.address,
            capacity: room.capacity,
            pricePerHour: room.pricePerHour
          });
          this.selectedEquipments = [...(room.equipments || [])];
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Salle introuvable.';
        }
      });
    }
  }

  onEquipmentChange(equipment: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked && !this.selectedEquipments.includes(equipment)) {
      this.selectedEquipments.push(equipment);
    } else if (!checked) {
      this.selectedEquipments = this.selectedEquipments.filter((e) => e !== equipment);
    }
  }

  onSubmit(): void {
    if (this.roomForm.invalid) {
      this.roomForm.markAllAsTouched();
      return;
    }

    this.successMessage = '';
    this.errorMessage = '';

    const payload = {
      ...this.roomForm.value,
      equipments: this.selectedEquipments
    };

    if (this.isEditMode && this.roomId) {
      this.roomService.updateRoom(this.roomId, payload).subscribe({
        next: (res) => {
          this.successMessage = res.message;
          setTimeout(() => this.router.navigate(['/agent/rooms']), 1000);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour.';
        }
      });
    } else {
      this.roomService.createRoom(payload).subscribe({
        next: (res) => {
          this.successMessage = res.message;
          setTimeout(() => this.router.navigate(['/agent/rooms']), 1000);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Erreur lors de la création.';
        }
      });
    }
  }
}