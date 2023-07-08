import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Observable, Subject, from, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

export enum PaintHubEvent {
  CanvasClearedEvent = 'CanvasClearedEvent',
  DrawEvent = 'DrawEvent',
  GetAllDrawingEvent = 'GetAllDrawingEvent',
  FailedEvent = 'FailedEvent',
  SuccessEvent = 'SuccessEvent'
}

export enum PaintHubRequest {
  ClearCanvasRequest = 'ClearCanvasRequest',
  DrawRequest = 'DrawRequest',
  GetRoomDrawingRequest = 'GetRoomDrawingRequest',
  JoinPaintRoomRequest = 'JoinPaintRoomRequest'
}

export class DrawModel {
  status: 'Start' | 'InProccess' | 'Finish' = 'Start';
  color: string = '';
  x: number = 0;
  y: number = 0;
  createdDate: string | Date = '';
}

@Injectable({
  providedIn: 'root'
})
export class PaintService {
  private connection?: HubConnection;
  
  private _canvasClearedSubject = new Subject<void>();
  private _drawSubject = new Subject<DrawModel>();
  private _getAllDrawingSubject = new Subject<DrawModel[]>();
  private _failedSubject = new Subject<{ action: PaintHubRequest, errorMessage: string }>();
  private _successSubject = new Subject<PaintHubRequest>();

  public canvasCleared$ = this._canvasClearedSubject.asObservable();
  public drawEvent$ = this._drawSubject.asObservable();
  public getAllDrawing$ = this._getAllDrawingSubject.asObservable();
  public failed$ = this._failedSubject.asObservable();
  public success$ = this._successSubject.asObservable();

  constructor(private authService: AuthService) { }

  getConnectionStatus(): HubConnectionState | undefined {
    return this.connection?.state
  }

  connect(): Observable<void> {
    console.log('Connecting to PaintHub...');

    if (this.connection) {
      return of();
    }

    this.connection = new HubConnectionBuilder()
      .withUrl(`${environment.baseApiUrl}/api/paint`, { 
        accessTokenFactory: () => this.authService.accessToken
      })
      .build();

    this.connection.on(PaintHubEvent.CanvasClearedEvent, () => {
      this._canvasClearedSubject.next();
    });

    this.connection.on(PaintHubEvent.DrawEvent, (drawModel: DrawModel) => {
      this._drawSubject.next(drawModel);
    });

    this.connection.on(PaintHubEvent.GetAllDrawingEvent, (drawModels: DrawModel[]) => {
      this._getAllDrawingSubject.next(drawModels);
    });

    this.connection.on(PaintHubEvent.FailedEvent, (operation: string, errorMessage: string) => {
      console.error(`Action ${operation} failed with error ${errorMessage}`);
      const action = Object.keys(PaintHubRequest)
        .map(key => PaintHubRequest[key as keyof typeof PaintHubRequest])
        .find(x => x === operation)!;

      this._failedSubject.next({ action: action, errorMessage: errorMessage });
    });

    this.connection.on(PaintHubEvent.SuccessEvent, (operation: string) => {
      console.log(`Action ${operation} completed successfully`);
      const action = Object.keys(PaintHubRequest)
        .map(key => PaintHubRequest[key as keyof typeof PaintHubRequest])
        .find(x => x === operation)!;

      this._successSubject.next(action);
    });

    return from(this.connection.start());
  }

  joinPaintRoomRequest(room: string): void {
    this.connection?.send(PaintHubRequest.JoinPaintRoomRequest, room);
  }

  clearCanvasRequest(room: string): void {
    this.connection?.send(PaintHubRequest.ClearCanvasRequest, room);
  }

  drawRequest(room: string, model: DrawModel): void {
    this.connection?.send(PaintHubRequest.DrawRequest, room, model);
  }

  getRoomDrawingRequest(room: string): void {
    this.connection?.send(PaintHubRequest.GetRoomDrawingRequest, room);
  }
}
