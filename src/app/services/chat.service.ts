import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private API_URL = 'https://backend-api-0m05.onrender.com/api/chat/message';
// private API_URL = 'http://localhost:5000/api/chat/message';

  constructor(private http: HttpClient) {}

  sendMessage(payload: any) {
    return this.http.post(this.API_URL, payload);
  }
}