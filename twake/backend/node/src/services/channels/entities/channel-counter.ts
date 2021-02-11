import { Type } from "class-transformer";
import { merge } from "lodash";
import { Entity, Column } from "../../../core/platform/services/database/services/orm/decorators";
import { ChannelType } from "../types";

export type ChannelCounterElementType = "members" | "guests" | "messages";

@Entity("channel_counter", {
  primaryKey: [["company_id", "workspace_id", "channel_id"], "type"],
  type: "channel_counter",
})
export class ChannelCounter {
  @Type(() => String)
  @Column("company_id", "string", { generator: "uuid" })
  company_id: string;

  // "uuid-v4" | "direct"
  @Type(() => String)
  @Column("workspace_id", "string", { generator: "uuid" })
  workspace_id: string | ChannelType.DIRECT;

  // uuid-v4
  @Type(() => String)
  @Column("channel_id", "string", { generator: "uuid" })
  channel_id: string;

  @Type(() => String)
  @Column("type", "string")
  type: ChannelCounterElementType;

  @Column("type", "counter")
  value: number;
}

export function getInstance(counter: Partial<ChannelCounter>): ChannelCounter {
  return merge(new ChannelCounter(), counter);
}
