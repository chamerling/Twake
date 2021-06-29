import { selectorFamily } from "recoil";
import { UserType } from "app/models/User";
import { UserListState } from "../atoms/UserList";

/**
 * Search users locally
 */
const searchUsers = selectorFamily<UserType[] | null, string>({
  key: "searchUsersSelector",
  get: (term) => async ({ get }) => {
    return get(UserListState).filter(user => `${user.username || ''} ${user.firstname || ''} ${user.lastname || ''} ${user.email || ''}`.includes(term));
  },
});

export default searchUsers;