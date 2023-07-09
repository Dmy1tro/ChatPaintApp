import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Observable, Subject, from, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

export enum ChatHubEvent {
  RoomCreated = 'RoomCreatedEvent',
  JoinedRoom = 'JoinedRoomEvent',
  LeavedRoom = 'LeavedRoomEvent',
  ReceivedMessage = 'ReceivedMessageEvent',
  Failed = 'FailedEvent',
  Success = 'SuccessEvent',
  GetMessagesResponse = 'GetMessagesResponseEvent',
  GetRoomsResponse = 'GetRoomsResponseEvent',
  GetParticipantsResponse = 'GetParticipantsResponseEvent'
}

export enum ChatHubRequest {
  GetRooms = 'GetRoomsRequest',
  CreateRoom = 'CreateRoomRequest',
  JoinRoom = 'JoinRoomRequest',
  LeaveRoom = 'LeaveRoomRequest',
  GetMessages = 'GetMessagesRequest',
  SendMessage = 'SendMessageRequest',
  GetParticipants = 'GetParticipantsRequest'
}

export class Message {
  userName: string = ''
  text: string = ''
  createdDate: string = ''
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private _connection?: HubConnection;

  private _getRoomsResponseSubject = new Subject<string[]>();
  private _roomCreatedSubject = new Subject<string>();
  private _joinedRoomSubject = new Subject<string>();
  private _leavedRoomSubject = new Subject<string>();
  private _receivedMessageSubject = new Subject<Message>();
  private _failedSubject = new Subject<{ action: ChatHubRequest, errorMessage: string }>();
  private _successSubject = new Subject<ChatHubRequest>();
  private _getMessagesResponseSubject = new Subject<Message[]>();
  private _getParticipantsResponseSubjcet = new Subject<string[]>();

  public getRoomsResponse$: Observable<string[]> = this._getRoomsResponseSubject.asObservable();
  public roomCreated$: Observable<string> = this._roomCreatedSubject.asObservable();
  public userJoinedRoom$: Observable<string> = this._joinedRoomSubject.asObservable();
  public userLeavedRoom$: Observable<string> = this._leavedRoomSubject.asObservable();
  public receivedMessage$: Observable<Message> = this._receivedMessageSubject.asObservable();
  public failed$: Observable<{ action: ChatHubRequest, errorMessage: string }> = this._failedSubject.asObservable();
  public success$: Observable<ChatHubRequest> = this._successSubject.asObservable();
  public getMessagesResponse$: Observable<Message[]> = this._getMessagesResponseSubject.asObservable();
  public getParticipantsResponse$: Observable<string[]> = this._getParticipantsResponseSubjcet.asObservable();

  // TODO:
  // Currently user can select only one chat on page, so store selected userName and room without any referencing and relations.
  public get selectedUserName(): string {
    return localStorage.getItem('userName') ?? '';
  }

  public set selectedUserName(userName: string) {
    localStorage.setItem('userName', userName);
  }

  constructor(private authService: AuthService) { }

  connect(): Observable<void> {
    console.log('Connecting to ChatHub...');
    
    if (this._connection) {
      return of();
    }

    this._connection = new HubConnectionBuilder()
      .withUrl(`${environment.baseApiUrl}/api/chat`,{
        accessTokenFactory: () => this.authService.accessToken
      })
      .build();

    this._connection.on(ChatHubEvent.GetRoomsResponse, (rooms: string[]) => {
      this._getRoomsResponseSubject.next(rooms);
    });

    this._connection.on(ChatHubEvent.RoomCreated, (room: string) => {
      this._roomCreatedSubject.next(room);
    });

    this._connection.on(ChatHubEvent.JoinedRoom, (userName: string) => {
      this._joinedRoomSubject.next(userName);
    });

    this._connection.on(ChatHubEvent.LeavedRoom, (userName: string) => {
      this._leavedRoomSubject.next(userName);
    });

    this._connection.on(ChatHubEvent.GetMessagesResponse, (messages: Message[]) => {
      this._getMessagesResponseSubject.next(messages);
    });

    this._connection.on(ChatHubEvent.ReceivedMessage, (message: Message) => {
      this._receivedMessageSubject.next(message);
    });

    this._connection.on(ChatHubEvent.GetParticipantsResponse, (participants: string[]) => {
      this._getParticipantsResponseSubjcet.next(participants);
    });

    this._connection.on(ChatHubEvent.Success, (action: string) => {
      console.log(`Action ${action} completed successfully`);

      const request = Object.keys(ChatHubRequest)
        .map(key => ChatHubRequest[key as keyof typeof ChatHubRequest])
        .find(x => x === action)!;

      this._successSubject.next(request);
    });

    this._connection.on(ChatHubEvent.Failed, (action: string, errorMessage: string) => {
      console.error(`Action ${action} failed with error ${errorMessage}`);

      const request = Object.keys(ChatHubRequest)
        .map(key => ChatHubRequest[key as keyof typeof ChatHubRequest])
        .find(x => x === action)!;

      this._failedSubject.next({ action: request, errorMessage: errorMessage });
    });

    return from(this._connection.start());
  }

  getConnectionStatus(): HubConnectionState | undefined {
    return this._connection?.state
  }

  // Requests
  getRooms() {
    this._connection?.send(ChatHubRequest.GetRooms);
  }

  createRoom(name: string) {
    this._connection?.send(ChatHubRequest.CreateRoom, name);
  }

  joinRoom(room: string, userName: string): void {
    this._connection?.send(ChatHubRequest.JoinRoom, room, userName)!;
  }

  getMessages(room: string) {
    this._connection?.send(ChatHubRequest.GetMessages, room);
  }

  sendMessage(room: string, text: string) {
    this._connection?.send(ChatHubRequest.SendMessage, room, text);
  }

  leaveRoom(room: string) {
    this._connection?.send(ChatHubRequest.LeaveRoom, room);
  }

  getParticipantsRequest(room: string) {
    this._connection?.send(ChatHubRequest.GetParticipants, room);
  }
}
