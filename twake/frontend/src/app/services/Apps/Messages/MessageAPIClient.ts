import Api from "app/services/Api";

type Feed = {
  channelId: string;
  workspaceId: string;
  companyId: string;
};

type Cursor = {
  page_token?: string;
  limit?: string;
  websockets?: boolean;
  direction?: "history" | "future";
};

type Message = {

}

const DEFAULT_LIMIT = "100";
const DEFAULT_DIRECTION = "history";

class MessageAPIClient {
  async getFeed(feed: Feed, cursor: Cursor): Promise<Message[]> {
    const searchParams = new URLSearchParams({
      page_token: cursor.page_token || '',
      limit: cursor.limit || DEFAULT_LIMIT,
      websockets: cursor.websockets ? "1" : "0",
      direction: cursor.direction || DEFAULT_DIRECTION,
    });

    return new Promise(resolve => {
      Api.get(
        `/internal/services/messages/v1/companies/${feed.companyId}/workspaces/${feed.workspaceId}/channels/${feed.channelId}/feed?${searchParams.toString()}`,
        (res: { resources: Message[] }): void => {
          resolve(res.resources && res.resources.length ? res.resources : []);
        });
      });
  }
}

export const client = new MessageAPIClient();
