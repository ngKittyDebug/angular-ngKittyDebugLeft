export interface UserProfileApiData {
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  pokemonNameFavorite: string[];
}

export interface UserProfileModel {
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  pokemonNameFavoriteList: string[];
}

export interface UpdateUserModel {
  username?: string;
  email?: string;
  password?: string;
}

export interface ChangePasswordModel {
  currentPassword?: string;
  newPassword: string;
}

export interface UserState {
  profile: UserProfileModel | null;
  favoritePokemonList: string[];
  isLoading: boolean;
  error: string | null;
  isPasswordChangedSuccess: boolean;
  isAccountDeleted: boolean;
}

export interface UpdateAvatarModel {
  avatar: string;
}

export interface PokemonFavoriteApiResponse {
  pokemonNameFavorite?: string[];
  pokemonNameFavoriteList?: string[];
}
