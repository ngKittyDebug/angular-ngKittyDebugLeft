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
import { UserPath } from '../constants/user-path.model';
import { getFullUrl } from '../helpers/full-url';

@Service()
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = AUTH_SERVER_URL;

  public getUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>(getFullUrl(this.baseUrl, UserPath.BASE));
  }

  public updateUser(data: UpdateUserModel): Observable<UserProfile> {
    return this.http.patch<UserProfile>(
      getFullUrl(this.baseUrl, `${UserPath.BASE}${UserPath.PROFILE}`),
      data,
    );
  }

  public changePassword(data: ChangePasswordModel): Observable<void> {
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

  public addFavorite(pokemonName: string): Observable<PokemonFavoriteResponse> {
    return this.http.post<PokemonFavoriteResponse>(
      getFullUrl(this.baseUrl, `${UserPath.BASE}${UserPath.POKEMON_FAVORITE}`),
      { pokemonName: pokemonName },
    );
  }

  public removeFavorite(pokemonName: string): Observable<PokemonFavoriteResponse> {
    return this.http.post<PokemonFavoriteResponse>(
      getFullUrl(this.baseUrl, `${UserPath.BASE}${UserPath.POKEMON_FAVORITE_DELETE}`),
      { pokemonName: pokemonName },
    );
  }
}
