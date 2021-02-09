import React, { useState, useEffect } from 'react';
import { Avatar, Badge, Tooltip } from 'antd';
import { User } from 'react-feather';

import { UserType } from 'app/models/User';
import UserService from 'services/user/user.js';
import UserListenerService from 'services/user/listen_users';
import OldCollections from 'services/Depreciated/Collections/Collections';
import UsersService from 'services/user/user.js';

export const useUsersListener = (usersIds: string[]) => {
  const channelMembers = (usersIds || []).filter(
    e => (usersIds.length || 0) === 1 || e !== UsersService.getCurrentUserId(),
    );
  OldCollections.get('users').useListener(useState, channelMembers);

  useEffect(() => {
    channelMembers?.map(userId => {
      UserListenerService.listenUser(userId);
      UserService.asyncGet(userId);
    });

    return () => {
      channelMembers?.map(userId => {
        UserListenerService.cancelListenUser(userId);
      });
    };
  }, []);
};

export const getUserParts = (props: {
  // array of user ids to render
  usersIds: string[];
  // should we display the current user
  keepMyself?: boolean;
  // maximum number of users to render
  max?: number;
  // size of the avatars
  size?: number;
  // display the name of each user in a tooltip?
  displayName?: boolean;
}): { avatar: JSX.Element; name: string; users: UserType[] } => {
  let channelMembers = (props.usersIds || []).filter(
    e =>
      props.keepMyself ||
      (props.usersIds.length || 0) === 1 ||
      e !== UsersService.getCurrentUserId(),
  );
  channelMembers = channelMembers.filter((e, i) => channelMembers.indexOf(e) === i);

  let avatar: JSX.Element = (
    <Avatar size={props.size || 20} icon={<User size={12} style={{ margin: 4 }} />} />
  );
  let channelName: string[] = [];

  let users: UserType[] = [];

  channelMembers?.map(userId => users.push(OldCollections.get('users').find(userId)));

  if (channelMembers?.length === 1) {
    const displayName = UserService.getFullName(users[0]);
    const avatarElement = (<Avatar size={props.size || 20} src={UserService.getThumbnail(users[0])} />);
    avatar = (
      <Badge count={0} size="default" dot offset={[-4, 16]}>
        { props.displayName ?
          <Tooltip title={displayName} placement="bottom">
            { avatarElement }
          </Tooltip>
        : avatarElement
        }
      </Badge>
    );
    channelName = [displayName];
  } else if (channelMembers?.length || 0 > 1) {
    avatar = (
      <Avatar.Group
        maxCount={props.max || 3}
        maxStyle={{
          color: '#FFFFFF',
          backgroundColor: `var(--grey-dark)`,
          width: props.size || 20,
          height: props.size || 20,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {users.map(member => {
          const displayName = UserService.getFullName(member);
          const avatarElement = <Avatar key={member.id} size={props.size || 20} src={UserService.getThumbnail(member)} />;
          channelName.push(displayName);
          return member && (
            props.displayName ?
              <Tooltip title={displayName} placement="bottom">
                { avatarElement }
              </Tooltip>
            : avatarElement
          );
        })}
      </Avatar.Group>
    );
  }

  return { avatar, name: channelName.join(', '), users };
};
