import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';
import type { Observable } from 'rxjs';
import type { UserProfile } from '../models/profile.model';
import { UserPath } from '../models/profile-path.model';
import { getFullUrl } from '../helpers/full-url';

@Service()
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = AUTH_SERVER_URL;

  public getUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(getFullUrl(this.baseUrl, UserPath.BASE));
  }
}
