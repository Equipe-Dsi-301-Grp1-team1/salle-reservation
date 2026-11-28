import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RoomInfo {
    id: string;
    name: string;
    description: string;
    address: string;
    capacity: number;
    pricePerHour: number;
    equipments: string[];
    photos: string[];
}

export interface BookingRequest {
    roomId: string;
    date: string;
    hours: number;
    guests: number;
    eventType: string;
}

export interface Booking {
    _id: string;
    reference: string;
    clientId: string;
    roomId: string | { _id: string; name: string; address?: string };
    date: string;
    hours: number;
    guests: number;
    eventType: string;
    amount: number;
    status: string;
    rejectionReason?: string;
    expiresAt?: string;
}

export interface ClientBooking {
    id: string;
    reference: string;
    room: {
        id: string;
        name: string;
        address: string;
        pricePerHour: number;
        photo: string;
    };
    date: string;
    dateLabel: string;
    hours: number;
    guests: number;
    eventType: string;
    amount: number;
    status: string;
    statusLabel: string;
    statusClass: string;
    rejectionReason: string;
    expiresAt: string | null;
    hoursLeft: number;
    daysLeft: number;
    canCancel: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class BookingService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api';

    private headers(): HttpHeaders {
        const token = localStorage.getItem('token');
        let headers = new HttpHeaders();
        if (token) {
            headers = headers.set('Authorization', 'Bearer ' + token);
        }
        return headers;
    }

    getRoomInfo(roomId: string): Observable<RoomInfo> {
        return this.http.get<RoomInfo>(`${this.apiUrl}/bookings/room/${roomId}`);
    }

    createBooking(data: BookingRequest): Observable<{ message: string; booking: Booking }> {
        return this.http.post<{ message: string; booking: Booking }>(
            `${this.apiUrl}/bookings`,
            data,
            { headers: this.headers() }
        );
    }

    listMine(status?: string): Observable<Booking[]> {
        let url = `${this.apiUrl}/bookings/me`;
        if (status) {
            url += '?status=' + status;
        }
        return this.http.get<Booking[]>(url, { headers: this.headers() });
    }

    getOne(id: string): Observable<ClientBooking> {
        return this.http.get<ClientBooking>(`${this.apiUrl}/bookings/${id}`, {
            headers: this.headers()
        });
    }

    cancelBooking(id: string): Observable<{ message: string; booking: ClientBooking }> {
        return this.http.patch<{ message: string; booking: ClientBooking }>(
            `${this.apiUrl}/bookings/${id}/cancel`,
            {},
            { headers: this.headers() }
        );
    }

    pay(id: string): Observable<{ message: string; mode: string; url: string | null; amount: number }> {
        return this.http.post<{ message: string; mode: string; url: string | null; amount: number }>(
            `${this.apiUrl}/bookings/${id}/pay`,
            {},
            { headers: this.headers() }
        );
    }

    confirmDemoPayment(id: string): Observable<{ message: string; booking: ClientBooking }> {
        return this.http.post<{ message: string; booking: ClientBooking }>(
            `${this.apiUrl}/bookings/${id}/pay/demo`,
            {},
            { headers: this.headers() }
        );
    }
}
