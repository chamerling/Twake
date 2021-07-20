type EphemeralMessage = {
  id: string; //Identifier of the ephemeral message
  version: string; //Version of ephemeral message (to update the view)
  recipient: string; //User that will see this ephemeral message
  recipient_context_id: string; //Recipient current view/tab/window to send the message to
};

/**
 * A Message contained in a feed of messages
 */
export class FeedMessage {
  thread_id: string | undefined;
  id: string | undefined;
  ephemeral: EphemeralMessage | undefined;
  type: "message" | "event" | undefined;
  subtype: "application" | "deleted" | "system" | undefined;
  created_at: number | undefined;
  updated_at: number | undefined;
  user_id: string | undefined;
  application_id: string | undefined;
  text: string | undefined;
  //blocks: Block[];
  files: string[] | undefined;
  context: any;
  edited: { edited_at: number; } | undefined;
  pinned_info: { pinned_at: number; pinned_by: string; } | undefined;
  reactions: { count: number; name: string; users: string[]; } | undefined;
  bookmarks: { user_id: string; bookmark_id: string; created_at: number; } | undefined;
  override: { title?: string; picture?: string; } | undefined;
}
