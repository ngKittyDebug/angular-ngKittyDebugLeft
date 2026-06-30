import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';
import { map, type Observable } from 'rxjs';
import type {
  ChangePasswordModel,
  PokemonFavoriteResponse,
  UpdateAvatar,
  UpdateUserModel,
  UserProfile,
} from '../models/profile.model';

import { getFullUrl } from '../helpers/full-url';
import { USER_PATH } from '../constants/user-path.constants';

@Service()
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = AUTH_SERVER_URL;

  public getUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(getFullUrl(this.baseUrl, USER_PATH.BASE));
  }

  public updateUser(data: UpdateUserModel): Observable<UserProfile> {
    return this.http.patch<UserProfile>(
      getFullUrl(this.baseUrl, `${USER_PATH.BASE}${USER_PATH.PROFILE}`),
      data,
    );
  }

  public changePassword(data: ChangePasswordModel): Observable<void> {
    return this.http.patch<void>(
      getFullUrl(this.baseUrl, `${USER_PATH.BASE}${USER_PATH.PASSWORD}`),
      data,
    );
  }

  public deleteAccount(): Observable<void> {
    return this.http.delete<void>(getFullUrl(this.baseUrl, USER_PATH.BASE));
  }

  public updateAvatar(data: UpdateAvatar): Observable<UpdateAvatar> {
    return this.http.patch<UpdateAvatar>(
      getFullUrl(this.baseUrl, `${USER_PATH.BASE}/${USER_PATH.AVATAR}`),
      data,
    );
  }

  public getFavorites(): Observable<string[]> {
    return this.http
      .get<PokemonFavoriteResponse>(
        getFullUrl(this.baseUrl, `${USER_PATH.BASE}${USER_PATH.POKEMON_FAVORITE}`),
      )
      .pipe(map((response) => response.pokemonNameFavoriteList));
  }

  public addFavorite(pokemonName: string): Observable<PokemonFavoriteResponse> {
    return this.http.post<PokemonFavoriteResponse>(
      getFullUrl(this.baseUrl, `${USER_PATH.BASE}${USER_PATH.POKEMON_FAVORITE}`),
      { pokemonName: pokemonName },
    );
  }

  public removeFavorite(pokemonName: string): Observable<PokemonFavoriteResponse> {
    return this.http.post<PokemonFavoriteResponse>(
      getFullUrl(this.baseUrl, `${USER_PATH.BASE}${USER_PATH.POKEMON_FAVORITE_DELETE}`),
      { pokemonName: pokemonName },
    );
  }
}
