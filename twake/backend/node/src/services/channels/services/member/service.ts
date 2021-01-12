import { RealtimeSaved, RealtimeDeleted } from "../../../../core/platform/framework";
import {
  DeleteResult,
  Pagination,
  ListResult,
  SaveResult,
  CrudExeption,
  OperationType,
  UpdateResult,
} from "../../../../core/platform/framework/api/crud-service";
import ChannelServiceAPI, { MemberService } from "../../provider";

import { Channel as ChannelEntity, ChannelMember, ChannelMemberPrimaryKey } from "../../entities";
import { ChannelExecutionContext, ChannelVisibility, WorkspaceExecutionContext } from "../../types";
import { Channel, User } from "../../../../services/types";
import { cloneDeep, isNil, omitBy } from "lodash";
import { updatedDiff } from "deep-object-diff";
import { pick } from "../../../../utils/pick";
import { getMemberPath, getRoomName } from "./realtime";
import { ChannelListOptions, ChannelMemberSaveOptions } from "../../web/types";
import { ResourcePath } from "../../../../core/platform/services/realtime/types";
import {
  PubsubParameter,
  PubsubPublish,
} from "../../../../core/platform/services/pubsub/decorators/publish";

export class Service implements MemberService {
  version: "1";

  constructor(private service: MemberService, private channelService: ChannelServiceAPI) {}

  async init(): Promise<this> {
    try {
      this.service.init && (await this.service.init());
    } catch (err) {
      console.error("Can not initialize channel member service");
    }

    return this;
  }

  @RealtimeSaved<ChannelMember>((member, context) => {
    return [
      //Send member preferences update to channels collections
      {
        room: `/companies/${member.company_id}/workspaces/${member.workspace_id}/channels?type=${
          member.workspace_id === ChannelVisibility.DIRECT ? "direct" : "private"
        }&user=${member.user_id}`,
        resource: {
          company_id: member.company_id,
          workspace_id: member.workspace_id,
          id: member.channel_id,
          user_member: member,
        },
      },
      {
        room: ResourcePath.get(getRoomName(context as ChannelExecutionContext)),
        path: getMemberPath(member, context as ChannelExecutionContext),
      },
    ];
  })
  async save(
    member: ChannelMember,
    options: ChannelMemberSaveOptions,
    context: ChannelExecutionContext,
  ): Promise<SaveResult<ChannelMember>> {
    let memberToSave: ChannelMember;
    const channel = await this.channelService.channels.get(context.channel);

    if (!channel) {
      throw CrudExeption.notFound("Channel does not exists");
    }

    const memberToUpdate = await this.service.get(this.getPrimaryKey(member), context);
    const mode = memberToUpdate ? OperationType.UPDATE : OperationType.CREATE;

    if (mode === OperationType.UPDATE) {
      const isCurrentUser = this.isCurrentUser(memberToUpdate, context.user);

      if (!isCurrentUser) {
        throw CrudExeption.badRequest("Channel member can not be updated");
      }

      const updatableParameters: Partial<Record<keyof ChannelMember, boolean>> = {
        notification_level: isCurrentUser,
        favorite: isCurrentUser,
        last_access: isCurrentUser,
      };

      // Diff existing channel and input one, cleanup all the undefined fields for all objects
      const memberDiff = omitBy(updatedDiff(memberToUpdate, member), isNil);
      const fields = Object.keys(memberDiff) as Array<Partial<keyof ChannelMember>>;

      if (!fields.length) {
        throw CrudExeption.badRequest("Nothing to update");
      }

      const updatableFields = fields.filter(field => updatableParameters[field]);

      if (!updatableFields.length) {
        throw CrudExeption.badRequest("Current user can not update requested fields");
      }

      memberToSave = cloneDeep(memberToUpdate);

      updatableFields.forEach(field => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (memberToSave as any)[field] = member[field];
      });

      const updateResult = await this.service.update(this.getPrimaryKey(member), memberToSave);
      this.onUpdated(context.channel, memberToSave, updateResult);
    } else {
      const currentUserIsMember = !!(await this.isChannelMember(context.user, channel));
      const isPrivateChannel = ChannelEntity.isPrivateChannel(channel);
      const isPublicChannel = ChannelEntity.isPublicChannel(channel);
      const isChannelCreator = channel.owner === context.user.id;

      // user can not join private channel by themself when it is private
      // only member can add other users in channel
      // The channel creator check is only here on channel creation
      if (isChannelCreator || (isPrivateChannel && currentUserIsMember) || isPublicChannel) {
        const saveResult = await this.service.save(member, options, context);
        this.onCreated(context.channel, member, saveResult);
      } else {
        throw CrudExeption.badRequest("User is not allowed to join this channel");
      }
    }

    return new SaveResult<ChannelMember>("channel_member", member, mode);
  }

  async get(
    pk: ChannelMemberPrimaryKey,
    context?: ChannelExecutionContext,
  ): Promise<ChannelMember> {
    // FIXME: Who can fetch a single member?
    return await this.service.get(this.getPrimaryKey(pk), context);
  }

  @RealtimeDeleted<ChannelMember>((member, context) => [
    {
      room: `/companies/${member.company_id}/workspaces/${member.workspace_id}/channels?type=${
        member.workspace_id === ChannelVisibility.DIRECT ? "direct" : "private"
      }&user=${member.user_id}`,
      resource: {
        company_id: member.company_id,
        workspace_id: member.workspace_id,
        id: member.channel_id,
        user_member: null,
      },
    },
    {
      room: ResourcePath.get(getRoomName(context as ChannelExecutionContext)),
      path: getMemberPath(member, context as ChannelExecutionContext),
    },
  ])
  async delete(
    pk: ChannelMemberPrimaryKey,
    context: ChannelExecutionContext,
  ): Promise<DeleteResult<ChannelMember>> {
    const memberToDelete = await this.service.get(pk, context);
    const channel = await this.channelService.channels.get(context.channel);

    if (!channel) {
      throw CrudExeption.notFound("Channel does not exists");
    }

    if (!memberToDelete) {
      throw CrudExeption.notFound("Channel member not found");
    }

    if (!this.isCurrentUser(memberToDelete, context.user)) {
      throw CrudExeption.badRequest("User does not have rights to remove member");
    }

    if (ChannelEntity.isPrivateChannel(channel)) {
      const canLeave = await this.canLeavePrivateChannel(context.user, channel);

      if (!canLeave) {
        throw CrudExeption.badRequest("User can not leave the private channel");
      }
    }

    const result = await this.service.delete(pk, context);

    this.onDeleted(context.channel, memberToDelete);

    return result;
  }

  list(
    pagination: Pagination,
    options: ChannelListOptions,
    context: ChannelExecutionContext,
  ): Promise<ListResult<ChannelMember>> {
    return this.service.list(pagination, options, context);
  }

  listUserChannels(
    user: User,
    pagination: Pagination,
    context: WorkspaceExecutionContext,
  ): Promise<ListResult<ChannelMember>> {
    return this.service.listUserChannels(user, pagination, context);
  }

  /**
   * Can leave only if the number of members is > 1
   * since counting rows in DB takes too much time
   * we query a list for 2 members without offset and check the length
   */
  async canLeavePrivateChannel(user: User, channel: ChannelEntity): Promise<boolean> {
    const list = this.list(new Pagination(undefined, "2"), {}, { channel, user });

    return (await list).getEntities().length > 1;
  }

  @PubsubPublish("channel:member:updated")
  onUpdated(
    @PubsubParameter("channel")
    channel: Channel,
    @PubsubParameter("member")
    member: ChannelMember,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateResult: UpdateResult<ChannelMember>,
  ): void {
    console.log("Member updated", member);
  }

  @PubsubPublish("channel:member:created")
  onCreated(
    @PubsubParameter("channel")
    channel: Channel,
    @PubsubParameter("member")
    member: ChannelMember,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createResult: SaveResult<ChannelMember>,
  ): void {
    console.log("Member created", member);
  }

  @PubsubPublish("channel:member:deleted")
  onDeleted(
    @PubsubParameter("channel")
    channel: Channel,
    @PubsubParameter("member")
    member: ChannelMember,
  ): void {
    console.log("Member deleted", member);
  }

  isCurrentUser(member: ChannelMember, user: User): boolean {
    return member.user_id === user.id;
  }

  isChannelMember(user: User, channel: Channel): Promise<ChannelMember> {
    return this.get({
      channel_id: channel.id,
      company_id: channel.company_id,
      workspace_id: channel.workspace_id,
      user_id: user.id,
    });
  }

  getPrimaryKey(
    memberOrPrimaryKey: ChannelMember | ChannelMemberPrimaryKey,
  ): ChannelMemberPrimaryKey {
    return pick(
      memberOrPrimaryKey,
      ...(["company_id", "workspace_id", "channel_id", "user_id"] as const),
    );
  }
}
