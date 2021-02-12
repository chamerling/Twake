import { Type } from "class-transformer";
import { Entity, Column } from "../../../core/platform/services/database/services/orm/decorators";
import { ChannelVisibility, ChannelType } from "../types";
import { ChannelMember } from "./channel-member";

@Entity("channel", {
  primaryKey: [["company_id", "workspace_id"], "id"],
  type: "channel",
})
export class Channel {
  // uuid-v4
  @Type(() => String)
  @Column("company_id", "uuid", { generator: "uuid" })
  company_id: string;

  @Type(() => String)
  @Column("workspace_id", "string", { generator: "uuid" })
  workspace_id: string | ChannelType.DIRECT;

  @Type(() => String)
  @Column("id", "uuid", { generator: "uuid" })
  id: string;

  @Column("name", "string")
  name: string;

  @Column("icon", "string")
  icon: string;

  @Column("description", "string")
  description: string;

  @Column("channel_group", "string")
  channel_group: string;

  @Column("visibility", "string")
  visibility: ChannelVisibility;

  @Column("is_default", "boolean")
  is_default: boolean;

  @Column("archived", "boolean")
  archived: boolean;

  @Column("archivation_date", "number")
  archivation_date: number;

  // uuid
  @Column("owner", "uuid")
  @Type(() => String)
  owner: string;

  @Column("members", "json")
  members: string[] = [];

  @Column("connectors", "json")
  connectors: string[] = []; //list of app-ids

  static isPrivateChannel(channel: Channel): boolean {
    return channel.visibility === ChannelVisibility.PRIVATE;
  }

  static isPublicChannel(channel: Channel): boolean {
    return channel.visibility === ChannelVisibility.PUBLIC;
  }

  static isDirectChannel(channel: Channel): boolean {
    return (
      channel.visibility === ChannelVisibility.DIRECT ||
      channel.workspace_id === ChannelVisibility.DIRECT
    );
  }
}

export class UserChannel extends Channel {
  user_member: ChannelMember;
}

export class UserDirectChannel extends UserChannel {
  direct_channel_members: string[];
}
