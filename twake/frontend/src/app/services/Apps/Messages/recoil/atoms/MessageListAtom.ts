import { atom } from 'recoil';
import { ChannelMessage } from '../ChannelMessageType';

export const MessageListAtom = atom<ChannelMessage[]>({
  key: 'MessageListState',
  default: [],
});
