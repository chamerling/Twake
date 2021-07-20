import { selectorFamily } from 'recoil';

import { ChannelMessagesSelector } from './ChannelMessagesSelector';
import { ChannelMessage } from '../ChannelMessageType';
import { ChannelParameters } from '../ChannelParametersType';

type ThreadParameters = ChannelParameters & {
  thread_id: string;
};

export const ThreadMessagesSelector = selectorFamily<ChannelMessage[], ThreadParameters>({
  key: 'ThreadMessagesSelector',
  get: (thread) => async ({ get }) => {

    const channelMessages = get(ChannelMessagesSelector({channelId: thread.channelId, companyId: thread.companyId, workspaceId: thread.workspaceId}));
    // TODO: Get the threadId in message
    return channelMessages.filter(message => message.id === thread.thread_id);

  },
});
