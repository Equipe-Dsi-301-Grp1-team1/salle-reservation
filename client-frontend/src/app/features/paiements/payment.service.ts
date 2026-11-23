import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { PaymentRow } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly api = inject(ApiService);

  mine(): Observable<PaymentRow[]> {
    return this.api.get<{ items: PaymentRow[] }>('/payments/me').pipe(map((r) => r.items));
  }

  simulate(sessionId: string): Observable<{ bookingId: string }> {
    return this.api.post<{ bookingId: string }>(`/payments/simulate/${encodeURIComponent(sessionId)}`);
  }
}
