import { Component, OnInit } from '@angular/core';
import { HubConnectionState } from '@microsoft/signalr';
import { combineLatest, first, of, switchMap } from 'rxjs';
import { ChatService } from './services/chat.service';
import { PaintService } from './services/paint.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(private authService: AuthService,
              private chatService: ChatService,
              private paintService: PaintService) {
  }

  ngOnInit(): void {
    this.authService.authorize()
      .pipe(
        switchMap(() => {
          return combineLatest([
            this.chatService.connect(),
            this.paintService.connect()
          ]);
        }),
        first()
      )
      .subscribe(() => {
        console.log('Connected!');
      });
  }

  get hubConnected(): boolean {
    return this.chatService.getConnectionStatus() === HubConnectionState.Connected &&
           this.paintService.getConnectionStatus() === HubConnectionState.Connected;
  }
}
