import { useRecoilState } from "recoil";
import { MessageListAtom } from "../atoms/MessageListAtom";

// hook to connect to stream of messages
export const useMessages = () => {
  const [messages, setMessages] = useRecoilState(MessageListAtom);

  // TODO: Connect to WS, then populate using setMessages

  return {
    messages
  };
};
