import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs';
import { errorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';
import { MetaService } from '../../core/meta.service';
import { Room } from '../../core/models';
import { formatLongDate } from '../../shared/dates';
import { EuroPipe } from '../../shared/euro.pipe';
import { fieldError } from '../../shared/forms';
import { BookingService } from './booking.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, EuroPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="card" [formGroup]="form" (ngSubmit)="submit()" novalidate aria-labelledby="bf-title">
      <h2 id="bf-title">Demander une réservation</h2>
      @if (date(); as d) {
        <p class="muted date">{{ longDate() }}</p>
      } @else {
        <p class="muted date">Choisissez un jour libre dans le calendrier.</p>
      }

      @if (success()) {
        <div class="alert alert-success" role="status">
          Votre demande a bien été envoyée. L’agent va l’examiner ; vous pourrez payer dès qu’elle sera validée.
          <a routerLink="/reservations">Voir mes réservations</a>
        </div>
      }
      @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }

      <div class="field">
        <span class="label" id="hours-label">Nombre d’heures</span>
        <div class="stepper" role="group" aria-labelledby="hours-label">
          <button type="button" class="btn btn-ghost" (click)="step(-1)" [disabled]="hours() <= limits().minHours" aria-label="Moins d’une heure">−</button>
          <input class="input" type="number" formControlName="hours" [min]="limits().minHours" [max]="limits().maxHours" aria-labelledby="hours-label" inputmode="numeric" />
          <button type="button" class="btn btn-ghost" (click)="step(1)" [disabled]="hours() >= limits().maxHours" aria-label="Une heure de plus">+</button>
        </div>
        @if (err('hours'); as m) { <p class="field-error">{{ m }}</p> }
      </div>

      <div class="field">
        <label for="guests">Invités (max. {{ room().capacity }})</label>
        <input id="guests" class="input" type="number" min="1" [max]="room().capacity" formControlName="guests" inputmode="numeric"
               [class.invalid]="err('guests')" />
        @if (err('guests'); as m) { <p class="field-error">{{ m }}</p> }
      </div>

      <div class="field">
        <label for="eventType">Type d’évènement</label>
        <input id="eventType" class="input" type="text" list="event-types" formControlName="eventType" maxlength="60"
               placeholder="Ex. Mariage" [class.invalid]="err('eventType')" />
        <datalist id="event-types">
          @for (t of meta.meta().eventTypes; track t) { <option [value]="t"></option> }
        </datalist>
        @if (err('eventType'); as m) { <p class="field-error">{{ m }}</p> }
      </div>

      <div class="sum">
        <div class="row line"><span>{{ room().pricePerHourCents | euro }} × {{ hours() }} h</span><span>{{ total() | euro }}</span></div>
        <div class="row total"><strong>Total</strong><span class="amt">{{ total() | euro }}</span></div>
        <p class="muted small">Le total change avec le nombre d’heures. Montant indicatif : le prix définitif est calculé par le serveur.</p>
      </div>

      <button type="submit" class="btn btn-primary btn-block" [disabled]="busy()">
        {{ busy() ? 'Envoi…' : 'Envoyer la demande' }}
      </button>
      <p class="muted small center">Vous payez après la validation de l’agent.</p>
    </form>
  `,
  styles: `
    .date { margin-bottom: 14px; }
    .stepper { display: grid; grid-template-columns: 48px 1fr 48px; gap: 8px; }
    .stepper .btn { padding: 0; font-size: 1.2rem; }
    .stepper input { text-align: center; }
    .sum { border-top: 1px solid var(--line); margin: 6px 0 16px; padding-top: 12px; }
    .line { justify-content: space-between; color: var(--muted); font-size: .92rem; }
    .total { justify-content: space-between; margin-top: 8px; }
    .amt { font-family: var(--font-title); font-weight: 700; font-size: 1.7rem; }
    .small { font-size: .82rem; margin: 8px 0 0; }
    .center { text-align: center; }
  `,
})
export class BookingFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(BookingService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly meta = inject(MetaService);

  readonly room = input.required<Room>();
  readonly date = input<string | null>(null);
  readonly created = output<void>();

  protected readonly limits = computed(() => this.meta.meta().limits);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly success = signal(false);
  protected readonly longDate = computed(() => (this.date() ? formatLongDate(this.date()!) : ''));

  protected readonly form = this.fb.nonNullable.group({
    hours: [4, [Validators.required, Validators.min(1), Validators.max(12)]],
    guests: [1, [Validators.required, Validators.min(1)]],
    eventType: ['', [Validators.required, Validators.maxLength(60)]],
  });

  protected readonly hours = toSignal(
    this.form.controls.hours.valueChanges.pipe(startWith(this.form.controls.hours.value), map((v) => Number(v) || 0)),
    { initialValue: 4 },
  );
  protected readonly total = computed(() => this.room().pricePerHourCents * this.hours());

  constructor() {
    effect(() => {
      const cap = this.room().capacity;
      const l = this.limits();
      this.form.controls.guests.setValidators([Validators.required, Validators.min(1), Validators.max(cap)]);
      this.form.controls.hours.setValidators([Validators.required, Validators.min(l.minHours), Validators.max(l.maxHours)]);
      this.form.controls.guests.updateValueAndValidity({ emitEvent: false });
      this.form.controls.hours.updateValueAndValidity({ emitEvent: false });
    });
    effect(() => {
      this.date();
      this.success.set(false);
      this.error.set('');
    }, { allowSignalWrites: true });
  }

  protected step(delta: number): void {
    const l = this.limits();
    const v = Math.min(l.maxHours, Math.max(l.minHours, Math.round(this.hours() || l.minHours) + delta));
    this.form.controls.hours.setValue(v);
  }

  protected err(name: 'hours' | 'guests' | 'eventType'): string | null {
    const c = this.form.controls[name];
    const l = this.limits();
    return fieldError(c, {
      required: name === 'eventType' ? 'Indiquez le type d’évènement.' : 'Ce champ est obligatoire.',
      min: name === 'hours' ? `Minimum ${l.minHours} heure.` : 'Au moins 1 invité.',
      max: name === 'hours' ? `Maximum ${l.maxHours} heures.` : `Cette salle accueille ${this.room().capacity} invités au maximum.`,
    });
  }

  protected submit(): void {
    this.success.set(false);
    this.error.set('');
    if (!this.auth.hasToken()) {
      this.router.navigate(['/connexion'], { queryParams: { returnUrl: `/salles/${this.room().id}` } });
      return;
    }
    const date = this.date();
    if (!date) {
      this.error.set('Choisissez d’abord un jour libre dans le calendrier.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.svc
      .create({ roomId: this.room().id, date, hours: Math.round(v.hours), guests: Math.round(v.guests), eventType: v.eventType.trim() })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.success.set(true);
          this.created.emit();
        },
        error: (e) => {
          this.busy.set(false);
          this.error.set(errorMessage(e));
        },
      });
  }
}
