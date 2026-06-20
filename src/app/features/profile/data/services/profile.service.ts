import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';
import { map, type Observable } from 'rxjs';
import type {
  ChangePasswordDto,
  PokemonFavoriteResponse,
  UpdateAvatar,
  UpdateUserDto,
  UserProfile,
} from '../models/profile.model';
import { UserPath } from '../models/profile-path.model';
import { getFullUrl } from '../helpers/full-url';

@Service()
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = AUTH_SERVER_URL;

  public getUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(getFullUrl(this.baseUrl, UserPath.BASE));
  }

  public updateUser(data: UpdateUserDto): Observable<UserProfile> {
    return this.http.patch<UserProfile>(
      getFullUrl(this.baseUrl, `${UserPath.BASE}${UserPath.PROFILE}`),
      data,
    );
  }

  public changePassword(data: ChangePasswordDto): Observable<void> {
    return this.http.patch<void>(
      getFullUrl(this.baseUrl, `${UserPath.BASE}${UserPath.PASSWORD}`),
      data,
    );
  }

  public deleteAccount(): Observable<void> {
    return this.http.delete<void>(getFullUrl(this.baseUrl, UserPath.BASE));
  }

  public updateAvatar(data: UpdateAvatar): Observable<UpdateAvatar> {
    return this.http.patch<UpdateAvatar>(
      getFullUrl(this.baseUrl, `${UserPath.BASE}${UserPath.AVATAR}`),
      data,
    );
  }

  public getFavorites(): Observable<string[]> {
    return this.http
      .get<PokemonFavoriteResponse>(
        getFullUrl(this.baseUrl, `${UserPath.BASE}${UserPath.POKEMON_FAVORITE}`),
      )
      .pipe(map((response) => response.pokemonNameFavorite));
  }

  public addFavorite(pokemonName: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/user/favorites/${pokemonName}`, {});
  }

  public removeFavorite(pokemonName: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/user/favorites/${pokemonName}`);
  }
}
