import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from "typeorm";
import { EventBus } from "../../../core/platform/framework";
import { Channel } from "./channel";

@EventSubscriber()
export class ChannelSubscriber implements EntitySubscriberInterface<Channel> {

  // eslint-disable-next-line @typescript-eslint/ban-types
  listenTo(): Function {
    return Channel;
  }

  afterInsert(event: InsertEvent<Channel>): void {
    EventBus.getInstance().namespace<Channel>("channel:created").emit(event.entity);
  }

  afterUpdate(event: UpdateEvent<Channel>): void {
    EventBus.getInstance().namespace<Channel>("channel:updated").emit(event.entity);

  }

  afterRemove(event: RemoveEvent<Channel>): void {
    EventBus.getInstance().namespace<Channel>("channel:removed").emit(event.entity);
  }
}