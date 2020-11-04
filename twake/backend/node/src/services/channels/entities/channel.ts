import { Type } from "class-transformer";
import { Column, Entity } from "../../../core/platform/services/database/orm/decorators";

export enum VisibilityEnum {
  PRIVATE = "private",
  PUBLIC = "public",
  DIRECT = "direct",
}

@Entity({
  name: "channel",
})
export class Channel {
  @Column({
    primary: true,
    type: "uuid-v4",
  })
  @Type(() => String)
  company_id: string;

  @Column({
    primary: true,
    type: "uuid-v4" | "direct",
  })
  @Type(() => String)
  workspace_id: string;

  @Column({
    primary: true,
    type: "uuid-v4",
  })
  @Type(() => String)
  id: string;

  @Column()
  @Type(() => String)
  name: string;

  @Column()
  icon: string;

  @Column()
  description: string;

  @Column()
  channel_group: string;

  @Column()
  visibility: VisibilityEnum;

  @Column()
  is_default: boolean;

  @Column()
  archived: boolean;

  @Column()
  archivation_date: number;

  // uuid
  @Type(() => String)
  @Column()
  owner: string;
}
