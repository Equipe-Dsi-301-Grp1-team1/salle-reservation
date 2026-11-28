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
}
