import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';
import { map, type Observable } from 'rxjs';
import type {
  ChangePasswordModel,
  PokemonFavoriteResponse,
  UpdateAvatar,
  UpdateUserModel,
  UserProfileApiData,
  UserProfileModel,
} from '../models/profile.model';

import { convertUserProfileApiDataToUserProfileModel } from '../helpers/convert-user-profile-api-data-to-user-profile-model';
import { extractFavoritePokemonList } from '../helpers/extract-favorite-pokemon-list';
import { getFullUrl } from '../helpers/full-url';
import { USER_PATH } from '../constants/user-path.constants';

@Service()
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = AUTH_SERVER_URL;

  public getUser(): Observable<UserProfileModel> {
    return this.http
      .get<UserProfileApiData>(getFullUrl(this.baseUrl, USER_PATH.BASE))
      .pipe(map(convertUserProfileApiDataToUserProfileModel));
  }

  public updateUser(data: UpdateUserModel): Observable<UserProfileModel> {
    return this.http
      .patch<UserProfileApiData>(
        getFullUrl(this.baseUrl, `${USER_PATH.BASE}${USER_PATH.PROFILE}`),
        data,
      )
      .pipe(map(convertUserProfileApiDataToUserProfileModel));
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
      .pipe(map(extractFavoritePokemonList));
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
