import { selectorFamily } from 'recoil';

import { MessageListAtom } from '../atoms/MessageListAtom';
import { ChannelMessage } from '../ChannelMessageType';
import { ChannelParameters } from '../ChannelParametersType';

export const ChannelMessagesSelector = selectorFamily<ChannelMessage[], ChannelParameters>({
  key: 'ChannelMessagesSelector',
  get: (channel) => async ({ get }) => {
    const messageListValue = get(MessageListAtom);

    return messageListValue.filter(
      message => (
        message.channel_id === channel.channelId && message.workspace_id === channel.workspaceId && message.company_id === channel.companyId
      )
    );
  },
});
