import { selector } from "recoil";
import { UserListState } from "../atoms/UserList";
import CurrentUser from "app/services/user/CurrentUser";
import { UserType } from "app/models/User";

export const currentUser = selector<UserType | undefined>({
  key: "currentUserSelector",
  get: (({ get }) => get(UserListState).find(user => (user.id === CurrentUser.get())))
});