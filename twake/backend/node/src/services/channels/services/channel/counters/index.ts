import { ChannelPrimaryKey } from "../../../provider";
import { Initializable } from "../../../../../core/platform/framework";
import { DatabaseServiceAPI } from "../../../../../core/platform/services/database/api";
import Repository from "../../../../../core/platform/services/database/services/orm/repository/repository";
import {
  ChannelCounter,
  ChannelCounterElementType,
  getChannelCounterInstance,
} from "../../../entities";

export class ChannelCounters implements Initializable {
  private repository: Repository<ChannelCounter>;

  constructor(private database: DatabaseServiceAPI) {}

  async init(): Promise<this> {
    this.repository = await this.database.getRepository("channel_counters", ChannelCounter);

    return this;
  }

  async increment(channel: ChannelPrimaryKey, type: ChannelCounterElementType): Promise<void> {
    const counter: ChannelCounter = getChannelCounterInstance({
      company_id: channel.company_id,
      workspace_id: channel.workspace_id,
      channel_id: channel.id,
      type,
    });

    await this.repository.increment(counter);
  }

  async decrement(channel: ChannelPrimaryKey, type: ChannelCounterElementType): Promise<void> {
    const counter: ChannelCounter = getChannelCounterInstance({
      company_id: channel.company_id,
      workspace_id: channel.workspace_id,
      channel_id: channel.id,
      type,
    });

    await this.repository.decrement(counter);
  }

  async setValue(
    channel: ChannelPrimaryKey,
    type: ChannelCounterElementType,
    value: number,
  ): Promise<void> {
    await this.delete(channel, type);

    const counter: ChannelCounter = getChannelCounterInstance({
      company_id: channel.company_id,
      workspace_id: channel.workspace_id,
      channel_id: channel.id,
      type,
      value,
    });

    await this.repository.save(counter);
  }

  async delete(channel: ChannelPrimaryKey, type: ChannelCounterElementType): Promise<void> {
    const counter = getChannelCounterInstance({
      company_id: channel.company_id,
      workspace_id: channel.workspace_id,
      channel_id: channel.id,
      type,
    });

    await this.repository.remove(counter);
  }
}
