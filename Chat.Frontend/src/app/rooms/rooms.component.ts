import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChatService } from '../services/chat.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.css']
})
export class RoomsComponent implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();

  rooms: string[] = []

  constructor(private chatService: ChatService,
              private router: Router) { }

  ngOnInit(): void {
    this.listenEvents()
    this.getRooms();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private listenEvents() {
    this.chatService.getRoomsResponse$
      .pipe(takeUntil(this.destroy$))
      .subscribe(rooms => {
        this.rooms = rooms
      });

    this.chatService.roomCreated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(room => {
        this.rooms.push(room);
      });
  }

  getRooms() {
    this.chatService.getRooms()
  }

  create() {
    const roomName = prompt('Enter the room name:');

    if (roomName) {
      this.chatService.createRoom(roomName);
    }
  }

  join(room: string) {
    const userName = prompt('Enter username:');

    if (userName) {
      this.chatService.selectedUserName = userName;
      this.router.navigate(['/room/', room]);
    }
  }
}
