import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Room {
  _id?: string;
  name: string;
  description: string;
  address: string;
  capacity: number;
  pricePerHour: number;
  equipments: string[];
  photos?: string[];
  isPublished?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AgentRoomService {
  private apiUrl = 'http://localhost:3000/api/agent';

  constructor(private http: HttpClient) {}

  getAllowedEquipments(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/equipments`);
  }

  getMyRooms(): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.apiUrl}/rooms`);
  }

  getRoomById(id: string): Observable<Room> {
    return this.http.get<Room>(`${this.apiUrl}/rooms/${id}`);
  }

  createRoom(room: Room): Observable<{ message: string; room: Room }> {
    return this.http.post<{ message: string; room: Room }>(`${this.apiUrl}/rooms`, room);
  }

  updateRoom(id: string, room: Room): Observable<{ message: string; room: Room }> {
    return this.http.put<{ message: string; room: Room }>(`${this.apiUrl}/rooms/${id}`, room);
  }

  deleteRoom(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/rooms/${id}`);
  }
}