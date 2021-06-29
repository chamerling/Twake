import { UserType } from "app/models/User";
import { atom } from "recoil";

export const UserListState = atom<UserType[]>({
  key: 'UserListState',
  default: [],
});
