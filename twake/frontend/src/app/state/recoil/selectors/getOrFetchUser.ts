import { selectorFamily, useSetRecoilState } from "recoil";

import { UserType } from "app/models/User";
import { UserListState } from "../atoms/UserList";
import UserAPIClient from "app/services/user/UserAPIClient";

/**
 * Get user from local state, or from remote if not found locally
 */
const getOrFetchUser = selectorFamily<UserType | null, string>({
  key: "getOrFetchUserSelector",
  get: (id) => async ({ get }) => {
    const setUsers = useSetRecoilState(UserListState);
    const userListValue = get(UserListState);

    const index = userListValue.findIndex(user => user.id === id);
    if (index > -1) {
      console.log("User already exists", userListValue[index]);
      return userListValue[index];
    }

    console.log("User does not exists locally, fetch it", id);
    const users = await UserAPIClient.list([id]);

    if (users && users.length) {
      setUsers(currentValue => [...currentValue, users[0]]);
    }

    return users[0];
  },
});

export default getOrFetchUser;