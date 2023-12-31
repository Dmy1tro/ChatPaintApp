import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationStart, Route, Router } from '@angular/router';
import { Subject, filter, first, map, race, takeUntil } from 'rxjs';
import { ChatService, ChatHubRequest, Message } from '../services/chat.service';
import { DrawModel, PaintService } from '../services/paint.service';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesContent') messagesContentRef!: ElementRef;
  @ViewChild('messageToSendInput') messageToSendInputRef!: ElementRef;

  roomName: string = '';
  userName: string = '';
  participants: string[] = [];
  messages: Message[] = [];
  messageToSend: string = '';

  canvasClearSubject$ = new Subject<void>();
  drawSubject$ = new Subject<DrawModel>();

  private destroy$ = new Subject<void>();

  constructor(private router: Router,
              private route: ActivatedRoute,
              private chatService: ChatService,
              private paintService: PaintService) { }

  ngOnInit(): void {
    this.roomName = this.route.snapshot.paramMap.get('name')!;
    this.userName = this.chatService.selectedUserName;

    if (!this.roomName || !this.userName) {
      this.router.navigate(['']);
      return;
    }

    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(($event) => {
        // If user go back or close tab then leave room.
        if ($event instanceof NavigationStart) {
          this.chatService.leaveRoom(this.roomName!)
        }
      });

    this.joinRoom(this.roomName, this.userName);
  }

  private joinRoom(room: string, userName: string) {
    this.chatService.success$
      .pipe(
        filter(action => action === ChatHubRequest.JoinRoom),
        first(),
        takeUntil(this.destroy$),
      ).subscribe(() => {
        this.listenHubEvents();
        this.runHubRequests();
      });

    this.chatService.failed$
      .pipe(
        filter(error => error.action === ChatHubRequest.JoinRoom),
        first(),
        takeUntil(this.destroy$)
      ).subscribe((res) => {
        console.error(res.errorMessage);
        this.router.navigate(['']);
      });

    this.chatService.joinRoom(room, userName);
  }

  ngAfterViewInit(): void {
    const messageToSendInput = this.messageToSendInputRef.nativeElement as HTMLElement;
    messageToSendInput.onkeydown = (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        this.sendMessage();
      }
    }
  }

  ngOnDestroy(): void {
    this.canvasClearSubject$.complete();
    this.drawSubject$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearCanvas(): void {
    this.canvasClearSubject$.next();
    this.paintService.clearCanvasRequest(this.roomName);
  }

  runHubRequests() {
    this.messages.push({ userName: 'You', text: 'Joined the room', createdDate: new Date().toJSON() });
    this.scrollToLatestMessage();
    this.chatService.getParticipantsRequest(this.roomName!);
    this.chatService.getMessages(this.roomName!);

    this.paintService.joinPaintRoomRequest(this.roomName);
    this.paintService.getRoomDrawingRequest(this.roomName);
  }

  onStartDrawing(drawModel: DrawModel):void {
    this.paintService.drawRequest(this.roomName, drawModel);
  }

  onDrawing(drawModel: DrawModel):void {
    this.paintService.drawRequest(this.roomName, drawModel);
  }

  onFinishDrawing(drawModel: DrawModel):void {
    this.paintService.drawRequest(this.roomName, drawModel);
  }

  sendMessage() {
    if (!this.messageToSend) {
      return;
    }

    this.chatService.sendMessage(this.roomName!, this.messageToSend);
    this.messageToSend = '';
  }

  back() {
    this.router.navigate(['']);
  }

  get participantsList(): string {
    return this.participants.join(', ');
  }

  private listenHubEvents() {
    this.chatService.getMessagesResponse$
      .pipe(takeUntil(this.destroy$))
      .subscribe(allMessages => {
        this.messages.unshift(...allMessages)
        this.scrollToLatestMessage({ forceScroll: true });
      });

    this.chatService.receivedMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.messages.push(message);
        this.scrollToLatestMessage();
      });

    this.chatService.userJoinedRoom$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userName => {
        this.messages.push({ userName: userName, text: 'Joined the room', createdDate: new Date().toJSON() });
        this.scrollToLatestMessage();
        this.participants.push(userName);
      });

    this.chatService.userLeavedRoom$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userName => {
        this.messages.push({ userName: userName, text: 'Leaved the room', createdDate: new Date().toJSON() });
        this.scrollToLatestMessage();
        this.participants = this.participants.filter(name => name !== userName);
      });

    this.chatService.getParticipantsResponse$
      .pipe(takeUntil(this.destroy$))
      .subscribe(participants => this.participants = participants);

    this.chatService.failed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (error.action === ChatHubRequest.GetMessages) {
          this.back();
        }
      });

    this.paintService.canvasCleared$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.canvasClearSubject$.next());

    this.paintService.drawEvent$
      .pipe(takeUntil(this.destroy$))
      .subscribe((drawModel) => {
        this.drawSubject$.next(drawModel);
      });

    this.paintService.getAllDrawing$
      .pipe(takeUntil(this.destroy$))
      .subscribe((drawModels) => {
        drawModels.forEach(drawModel => {
          this.drawSubject$.next(drawModel);
        });
      });
  }

  private scrollToLatestMessage(scrollOptions: { forceScroll: boolean } = { forceScroll: false }): void {
    // Warning dirty hack!
    // Use setTimeout to execute code after angular run change detection and apply UI changes.
    setTimeout(() => {
      const messagesContent = this.messagesContentRef.nativeElement as HTMLElement;
      const messageToSendInput = this.messageToSendInputRef.nativeElement as HTMLElement;

      const lastThreeMessagesHeight = 200; // Approximate height
      const scrolledUpHeight = Math.abs(messagesContent.scrollHeight - messagesContent.offsetHeight - messagesContent.scrollTop)
      const isUserWatchingPreviousesMessages = scrolledUpHeight > lastThreeMessagesHeight;

      if (isUserWatchingPreviousesMessages && !scrollOptions.forceScroll) {
        // Just focus input field and don't scroll to latest message.
        messageToSendInput.focus();
        return;
      }

      messagesContent.scroll({ top: messagesContent.scrollHeight, behavior: 'smooth' });
      messageToSendInput.focus();
    });
  }
}
