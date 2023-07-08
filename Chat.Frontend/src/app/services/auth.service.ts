import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authUrl = `${environment.baseApiUrl}/api/auth`;

  public accessToken: string = '';

  constructor(private httpClient: HttpClient) { }

  authorize(): Observable<void> {
    return this.httpClient.post<{ accessToken: string }>(`${this.authUrl}/authorize`, {})
      .pipe(
        map(tokenHolder => {
          this.accessToken = tokenHolder.accessToken;
          return;
        })
      );
  }
}
