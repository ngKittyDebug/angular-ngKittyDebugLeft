export interface UserProfile {
  id?: string;
  username: string;
  email: string;
  avatarUrl?: string;
  favoritePokemons: string[];
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
}

export interface ChangePasswordDto {
  currentPassword?: string;
  newPassword: string;
}

export interface UserState {
  profile: UserProfile | null;
  favoritePokemons: string[];
  isLoading: boolean;
  error: string | null;
  isPasswordChangedSuccess: boolean;
}

export interface UpdateAvatar {
  avatar: string;
}

export interface PokemonFavoriteResponse {
  pokemonNameFavorite: string[];
}
