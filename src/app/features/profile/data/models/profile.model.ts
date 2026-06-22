export interface UserProfile {
  id?: string;
  username: string;
  email: string;
  avatarUrl?: string;
  favoritePokemonList: string[];
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
  profile: UserProfile | null;
  favoritePokemonList: string[];
  isLoading: boolean;
  error: string | null;
  isPasswordChangedSuccess: boolean;
}

export interface UpdateAvatar {
  avatar: string;
}

export interface PokemonFavoriteResponse {
  pokemonNameFavoriteList: string[];
}
