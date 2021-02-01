import {
  CRUDService,
  ListResult,
  Pagination,
} from "../../core/platform/framework/api/crud-service";
import { TwakeServiceProvider, Initializable } from "../../core/platform/framework/api";
import {
  ChannelTab,
  ChannelTabPrimaryKey,
  Channel,
  ChannelMember,
  ChannelMemberPrimaryKey,
  DefaultChannel,
  DefaultChannelPrimaryKey,
} from "./entities";
import { ChannelExecutionContext, WorkspaceExecutionContext } from "./types";
import User from "../user/entity/user";
import { DirectChannel } from "./entities/direct-channel";

export type ChannelPrimaryKey = {
  id?: string;
  company_id?: string;
  workspace_id?: string;
};

export interface ChannelService
  extends TwakeServiceProvider,
    Initializable,
    CRUDService<Channel, ChannelPrimaryKey, WorkspaceExecutionContext> {
  /**
   * Create direct channel
   *
   * @param directChannel
   */
  createDirectChannel(directChannel: DirectChannel): Promise<DirectChannel>;

  /**
   * Get all the direct channels for a user
   * TODO: Return a list of Channel with a list of users
   * @param user
   */
  getDirectChannel(directChannel: DirectChannel): Promise<DirectChannel>;

  /**
   * Get a direct channel in company for given company id and set of users
   */
  getDirectChannelInCompany(companyId: string, users: string[]): Promise<DirectChannel>;

  /**
   * Get all the direct channels in a company for the given user
   *
   * @param companyId
   * @param userId
   */
  getDirectChannelsForUsersInCompany(companyId: string, userId: string): Promise<DirectChannel[]>;

  /**
   * Mark the channel as read for the given user
   *
   * @param channel
   * @param user
   */
  markAsRead(
    channel: ChannelPrimaryKey,
    user: User,
    context: WorkspaceExecutionContext,
  ): Promise<boolean>;

  /**
   * Mark the channel as unread
   *
   * @param channel
   * @param user
   * @param context
   */
  markAsUnread(
    channel: ChannelPrimaryKey,
    user: User,
    context: WorkspaceExecutionContext,
  ): Promise<boolean>;
}
export interface MemberService
  extends TwakeServiceProvider,
    Initializable,
    CRUDService<ChannelMember, ChannelMemberPrimaryKey, ChannelExecutionContext> {
  listUserChannels(
    user: User,
    pagination: Pagination,
    context: WorkspaceExecutionContext,
  ): Promise<ListResult<ChannelMember>>;

  /**
   * Add a list of users to channel.
   * This never rejects: If the user is not added, it will not be in the result list
   *
   * @param users Users to add
   * @param channel Channel to add users to
   */
  addUsersToChannel(users: User[], channel: ChannelPrimaryKey): Promise<ListResult<ChannelMember>>;

  /**
   * Check if user is channel member
   */
  isChannelMember(user: User, channel: Channel): Promise<ChannelMember>;
}

export interface TabService
  extends TwakeServiceProvider,
    Initializable,
    CRUDService<ChannelTab, ChannelTabPrimaryKey, ChannelExecutionContext> {}

export default interface ChannelServiceAPI extends TwakeServiceProvider, Initializable {
  channels: ChannelService;
  members: MemberService;
  tabs: TabService;
}

/**
 * Manage default channels entities
 */
export interface DefaultChannelService
  extends TwakeServiceProvider,
    Initializable,
    CRUDService<DefaultChannel, DefaultChannelPrimaryKey, ChannelExecutionContext> {}
