import { Message } from "../Message";

export type ChannelMessage = Message & {
  workspace_id: string;
  company_id: string;
};
