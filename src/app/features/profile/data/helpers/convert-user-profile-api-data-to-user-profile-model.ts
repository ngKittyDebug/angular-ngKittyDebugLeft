import type { UserProfileApiData, UserProfileModel } from '../models/profile.model';

export const convertUserProfileApiDataToUserProfileModel = (
  apiData: UserProfileApiData,
): UserProfileModel => ({
  username: apiData.username,
  email: apiData.email,
  avatar: apiData.avatar,
  createdAt: apiData.createdAt,
  pokemonNameFavoriteList: apiData.pokemonNameFavorite,
});
