import DepreciatedCollections from 'app/services/Depreciated/Collections/Collections';
import Numbers from 'services/utils/Numbers';
import Observable from 'app/services/Depreciated/observable';
import Notifications from 'services/user/notifications';
import { ChannelResource } from 'app/models/Channel';
import Collections from 'app/services/CollectionsReact/Collections';
import logger from 'app/services/Logger';
import { Message } from './Message';
import { FeedLoader, NextParameters, FeedResponse, InitParameters } from '../Feed/FeedLoader';

const DEFAULT_PAGE_SIZE = 25;

/*
  This class will manage what is loaded from the backend and what's not, the complete list of messages for a channel will always be h
*/
export class MessageLoader extends Observable implements FeedLoader<Message> {
  private pageSize!: number;

  /**
   * First message of the feed has been reached. There are no more ways to load more upwards.
   * Once true, this property should not be updated anymore.
   */
  private topHasBeenReached = false;

  /**
   * Last message of the feed has been reached. The only way to have this switching back from true to false is when new messages are piped down the stream.
   */
  private bottomHasBeenReached = false;

  /**
   * The first message of the stream. Once set, there are no ways to get oldest messages than this one and so the stream is marked as complete at top side
   */
  private firstMessageOfTheStream = '';

  /**
   * The identifier of the first message which has been loaded ie the oldest message from all the messages received 
   */
  private firstMessageOffset = '';

  /**
   * The identifier of the last message which has been loaded ie the yougest message from all the messages received 
   */
  private lastMessageOffset = '';

  private lastThreadOffset = '';

  /**
   * Last message of the stream. Its value can change if new messages are created
   */
  private lastMessageOfTheStream = '';

  private initialDirection: 'up' | 'down';

  /**
   * Last message of the feed, this is the one which has the bigger creation date | timeuuid (ie the youngest)
   */
  private lastMessageId: string = '';
  /**
   * First message of the feed, this is the one which has the smaller creation date | timeuuid (ie the oldest)
   */
  private firstMessageId: string = '';

  private didInit = false;
  private destroyed = false;
  private httpLoading = false;

  // FIXME: Move it to the channel related service
  private readChannelTimeout: any;
  private lastReadMessage: string = '';

  constructor(
    private companyId: string = '',
    private workspaceId: string = '',
    private channelId: string = '',
    private threadId: string = '',
    private collectionKey: string,
  ) {
    super();
    this.initialDirection = 'up';
    this.onNewMessageFromWebsocketListener = this.onNewMessageFromWebsocketListener.bind(this);
  }

  async init(params: InitParameters = { direction: 'up' }): Promise<FeedResponse<Message>> {
    this.pageSize = params.pageSize || DEFAULT_PAGE_SIZE;
    this.initialDirection = params.direction ? params.direction : this.initialDirection;
    DepreciatedCollections.get('messages').addListener(this.onNewMessageFromWebsocketListener);

    if (this.httpLoading) {
      logger.warn("Init in progress, skipping");
      return this.buildResponse([], false, params);
    }

    if (this.didInit) {
      // In case init was already called, we reset the cursors so that we can switch between message lists
      // If, one day, we have collection which are managing cache and are able to receive resources in the background
      // then we should be able to load the cache from here and return directly instead of having to add the souce below again and again
      this.reset(true);
    }

    if (params.offset) {// && this.initialDirection === 'down') {
      this.firstMessageOffset = params.offset;
    }

    return new Promise<FeedResponse<Message>>(resolve => {
      if (!this.didInit) {
        this.httpLoading = true;
      }
      if (this.destroyed) {
        this.destroyed = false;
        return this.buildResponse([], false, params);
      }

      DepreciatedCollections.get('messages').addSource(
        {
          http_base_url: 'discussion',
          http_options: {
            channel_id: this.channelId,
            company_id: this.companyId,
            workspace_id: this.workspaceId,
            parent_message_id: this.threadId,
            limit: (this.initialDirection === "up" ? 1 : -1) * this.pageSize,
            offset: params.offset || false,
          },
          websockets: [{ uri: `messages/${this.channelId}`, options: { type: 'messages' } }],
        },
        this.collectionKey,
        // First load callback
        (messages: Message[]) => {
          logger.debug("Initial messages", messages);
          this.updateCursors(messages);
          this.httpLoading = false;

          // loading a thread
          if (this.threadId) {
            if (messages.length < this.pageSize) {
              this.setBottomIsComplete();
            }  
          }

          // loading from an initial offset ie opening feed from a given message
          if (!this.threadId && params.offset && this.initialDirection === 'down') {
            // this simply store the message we want to start from and all its responses.
            // The last response will be the last item cursor
            // So we are missing all the other messages after the initial one...
            if (messages.length < this.pageSize) {
              this.setBottomIsComplete();
            }
          }

          if (!params.offset && this.initialDirection === 'up') {
            // without any offset, we loaded all the bottom messages on this first call
            this.setBottomIsComplete();
          }

          if (messages[0]?.hidden_data?.type === 'init_channel' || messages.length < this.pageSize) {
            this.setTopIsComplete()
          }

          if (this.threadId && this.initialDirection === 'down') {
            // TODO: Move this in the first block
            this.setTopIsComplete();
          }

          // bottom reached?
          if (!params.offset && messages.length < this.pageSize) {
            this.setBottomIsComplete();
          }

          this.notify();
          this.didInit = true;

          resolve(this.buildResponse(this.getItems(), false, params));
        },
      );
    });
  }

  async nextPage(params: { direction: 'up' | 'down'}): Promise<FeedResponse<Message>> {
    const loadUp = params.direction === 'up';
    logger.debug("nextPage - ", params);

    if (!this.didInit) {
      throw new Error("Loader must be initialized first");
    }

    if (this.httpLoading) {
      logger.debug("nextPage - HTTP is already ongoing");

      return this.buildResponse([], false, params);
    }

    let offset = loadUp ? this.firstMessageOffset : this.lastThreadOffset;
    if (this.threadId) {
      offset = this.firstMessageOffset;
    }

    const fromTo = {from: "", to: ""};
    if (loadUp) {
      fromTo.to = this.firstMessageOffset;
    } else {
      // TODO: Check this!
      fromTo.from = this.lastThreadOffset || this.lastMessageOffset;
    }

    return new Promise(resolve => {
      this.httpLoading = true;
      DepreciatedCollections.get('messages').sourceLoad(
        this.collectionKey,
        {
          offset,
          limit: (loadUp ? 1 : -1) * this.pageSize,
        },
        (messages: Message[]) => {
          logger.debug("nextPage - messages", messages);
          this.httpLoading = false;
          this.updateCursors(messages);

          if (messages.length < this.pageSize) {
            loadUp ? this.setTopIsComplete() : this.setBottomIsComplete();
          }

          if (loadUp) {
            fromTo.from = this.firstMessageOffset;
          } else {
            fromTo.to = Numbers.maxTimeuuid(this.lastThreadOffset, this.lastMessageId);
          }

          console.log("FROMTO2", fromTo, offset, "lastThreadOffset:", this.lastThreadOffset, "lastMessageOffset:", this.lastMessageOffset);


          //const fromTo = loadUp ?
          //  { from: this.firstMessageOffset, to: offset || this.lastMessageOffset } :
          //  { from: offset || this.firstMessageOffset, to: this.lastMessageOffset };

          resolve(this.buildResponse(this.getItems(fromTo), true, params));
        },
      )
    });
  }

  private buildResponse(items: Message[], loaded: boolean, params: NextParameters, err?: Error): FeedResponse<Message> {
    return {
      items,
      loaded,
      completes: {
        bottom: this.bottomHasBeenReached,
        top: this.topHasBeenReached,
      },
      offsets: {
        down: this.lastMessageOffset,
        up: this.firstMessageOffset,
      },
      query: {
        direction: params.direction,
        pageSize: this.pageSize,
        offset: params.offset,
      },
      err,
    };
  }

  getItems(fromTo?: { from: string, to: string }): Message[] {
    const offsets = fromTo || { from: this.firstMessageId, to: this.lastMessageId };

    logger.debug("Get items", offsets);
    const filter: any = {
      channel_id: this.channelId,
    };
    if (this.threadId) {
      filter.parent_message_id = this.threadId;
    }
    let messages: Message[] = DepreciatedCollections.get('messages').findBy(filter);

    // TODO: Why did we need this?
    // this.detectNewWebsocketsMessages(messages);

    messages = messages
      // keep only the messages between the first and last loaded ones 
      .filter(message => (
        Numbers.compareTimeuuid(offsets.to, message.id) >= 0 &&
        Numbers.compareTimeuuid(offsets.from, message.id) <= 0
      ))
      // remove ephemeral messages
      .filter(message => !message._user_ephemeral)
      // sort them by creation date
      .sort((a, b) => (a?.creation_date || 0) - (b?.creation_date || 0));

    if (!this.threadId) {
      let lastParentId = '';
      messages = messages.filter(message => {
        if (message.parent_message_id) {
          return (
            lastParentId &&
            lastParentId !== message.parent_message_id &&
            Numbers.compareTimeuuid(message.parent_message_id, message.id) <= 0
          )
          ? true : false;
        } else {
          lastParentId = message.id || '';
        }
        return true;
      });
    }

    return messages;
  }

  /**
   * Updates the last message of the feed with the given one if and only if it is newer than the previous one
   *
   * @param message
   * @returns 
   */
  private setLastMessageId(message: Message): void {
    if (!message || !message.id) {
      return;
    }

    if (!this.lastMessageId) {
      this.lastMessageId = message.id;
    } else {
      this.lastMessageId = Numbers.compareTimeuuid(this.lastMessageId, message.id) <= 0 ? message.id : this.lastMessageId;
    }
  }

  private setLastThreadId(message: Message): void {
    if (!message || message.parent_message_id || !message.id) {
      return;
    }

    if (!this.lastThreadOffset) {
      this.lastThreadOffset = message.id;
    } else {
      this.lastThreadOffset = Numbers.compareTimeuuid(this.lastThreadOffset, message.id) <= 0 ? message.id : this.lastThreadOffset;
    }
  }
 
  private setFirstMessageId(message: Message): void {
    if (!message || !message.id) {
      return;
    }

    if (!this.firstMessageId) {
      this.firstMessageId = message.id;
    } else {
      this.firstMessageId = Numbers.compareTimeuuid(this.firstMessageId, message.id) >= 0 ? message.id : this.firstMessageId;
    }
  }

  private hasLastMessage(): boolean {
    return !!this.lastMessageOfTheStream;
  }

  private detectNewWebsocketsMessages(messages: Message[]): Message[] {
    const newUnknownMessages: Message[] = [];

    messages.forEach(m => {
      if (Numbers.compareTimeuuid(this.lastMessageId, m.id) < 0) {
        newUnknownMessages.push(m);
      }
    });

    newUnknownMessages.forEach(m => this.onNewMessageFromWebsocket(m));

    return newUnknownMessages;
  }

  private onNewMessageFromWebsocketListener(_event: any): void {
    const newMessages = this.detectNewWebsocketsMessages(
      DepreciatedCollections.get('messages').findBy({
        channel_id: this.channelId,
      }),
    );
    logger.debug("New messages from websocket", newMessages);
    if (newMessages.length) {
      this.notify();
    }
  }

  private onNewMessageFromWebsocket(message: Message) {
    // simply update the first and last messages and not the pagination
    this.updateFirstLast([message]);
  }

  private reset(force?: boolean) {
    this.firstMessageOffset = '';
    this.lastMessageOffset = '';
    this.lastMessageId = '';
    this.lastThreadOffset = '';
    if (force) {
      this.firstMessageOfTheStream = '';
      this.lastMessageOfTheStream = '';
      this.topHasBeenReached = false;
      this.bottomHasBeenReached = false;
    }
  }

  private updateCursors(messages: Message[] = []) {
    logger.debug("Updating pagination cursors with messages", messages.map(m => m.id).join(' - '));
    this.printCursors('Before update');

    const wasAtEnd = this.hasLastMessage();

    this.lastMessageOffset = Numbers.maxTimeuuid(
      this.lastMessageOffset,
      '00000000-0000-1000-0000-000000000000',
    );
    messages.forEach(m => {
      if (m.hidden_data?.type === 'init_channel') {
        this.topHasBeenReached = true;
      }
      this.setLastMessageId(m);
      this.setFirstMessageId(m);
      this.setLastThreadId(m);
      this.lastMessageOffset = Numbers.maxTimeuuid(this.lastMessageOffset, m.id);
      this.firstMessageOffset = Numbers.minTimeuuid(this.firstMessageOffset, m.id);
    });


    if (wasAtEnd) {
      this.lastMessageOfTheStream = Numbers.maxTimeuuid(
        this.lastMessageOfTheStream,
        this.lastMessageOffset,
      );
    }
    this.printCursors("After update");
  }

  /**
   * Update the first and last message cursors. We do not update the pagination ones here, just the global ones.
   * 
   * @param messages 
   */
  private updateFirstLast(messages: Message[] = []): void {
    messages.forEach(m => {
      if (m.hidden_data?.type === 'init_channel') {
        this.topHasBeenReached = true;
      }
      // TODO: update the last thread
      this.setLastMessageId(m);
      this.setFirstMessageId(m);
    });
  }

  private printCursors(label: string = '') {
    logger.debug(`${label} Cursors:
      firstMessageOffset: ${this.firstMessageOffset},
      lastMessageOffset: ${this.lastMessageOffset},
      lastThreadOffset: ${this.lastThreadOffset},
      lastMessageOfTheStream: ${this.lastMessageOfTheStream},
      firstMessageId: ${this.firstMessageId},
      lastMessageId: ${this.lastMessageId},
    `);
  }

  private setTopIsComplete(): void {
    this.firstMessageOfTheStream = Numbers.minTimeuuid(
      this.firstMessageOffset,
      this.firstMessageOfTheStream,
    );
    logger.debug("Top is complete and firstMessageOfTheStream is set to", this.firstMessageOfTheStream);
    this.topHasBeenReached = true;
  }

  private setBottomIsComplete(): void {
    this.lastMessageOfTheStream = this.lastMessageOffset;
    logger.debug("Bottom is complete and lastMessageOfTheStream is set to", this.lastMessageOfTheStream);
    this.bottomHasBeenReached = true;
  }

  destroy() {
    this.destroyed = true;
    this.httpLoading = false;

    DepreciatedCollections.get('messages').removeSource(this.collectionKey);
    DepreciatedCollections.get('messages').removeListener(this.onNewMessageFromWebsocketListener);
  }

  readChannelOrThread() {
    if (this.readChannelTimeout) {
      clearTimeout(this.readChannelTimeout);
    }
    if (this.lastReadMessage === this.lastMessageOffset) {
      return;
    }
    this.readChannelTimeout = setTimeout(() => {
      const path = `/channels/v1/companies/${this.companyId}/workspaces/${this.workspaceId}/channels/::mine`;
      const collection = Collections.get(path, ChannelResource);
      const channel = collection.findOne({ id: this.channelId }, { withoutBackend: true });
      this.lastReadMessage = this.lastMessageOffset;
      Notifications.read(channel);
    }, 500);
  }
}