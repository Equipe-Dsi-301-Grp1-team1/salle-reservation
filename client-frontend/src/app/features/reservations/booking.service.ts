import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Booking, BookingRequest, Page } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = inject(ApiService);

  create(req: BookingRequest): Observable<Booking> {
    return this.api.post<{ booking: Booking }>('/bookings', req).pipe(map((r) => r.booking));
  }

  mine(status?: string, page?: number): Observable<Page<Booking>> {
    return this.api.get<Page<Booking>>('/bookings/me', { status, page });
  }

  get(id: string): Observable<Booking> {
    return this.api.get<{ booking: Booking }>(`/bookings/${id}`).pipe(map((r) => r.booking));
  }

  cancel(id: string): Observable<Booking> {
    return this.api.patch<{ booking: Booking }>(`/bookings/${id}/cancel`).pipe(map((r) => r.booking));
  }

  pay(id: string): Observable<{ url: string; sessionId: string }> {
    return this.api.post<{ url: string; sessionId: string }>(`/bookings/${id}/pay`);
  }

  receipt(id: string): Observable<Blob> {
    return this.api.blob(`/bookings/${id}/receipt`);
  }

  downloadReceipt(id: string): Observable<void> {
    return this.receipt(id).pipe(
      map((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recu-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
    );
  }
}
