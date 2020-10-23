import { logger } from "../../logger";
import { RealtimeEntityActionType, RealtimeEntityEvent } from "../types";
import WebSocketAPI from "../../../services/websocket/provider";
import { eventBus } from "../bus";

export default class RealtimeEntityManager {
  constructor(private ws: WebSocketAPI) {}

  init(): void {
    eventBus.subscribe(RealtimeEntityActionType.Created, event => {
      this.pushResourceEvent(event, RealtimeEntityActionType.Created);
    });

    eventBus.subscribe(RealtimeEntityActionType.Updated, event => {
      this.pushResourceEvent(event, RealtimeEntityActionType.Updated);
    });

    eventBus.subscribe(RealtimeEntityActionType.Deleted, event => {
      this.pushResourceEvent(event, RealtimeEntityActionType.Deleted);
    });
  }

  private pushResourceEvent(event: RealtimeEntityEvent<any>, action: RealtimeEntityActionType): boolean {
    logger.info(`Pushing ${action} entity to room ${event.path}`);

    return this.ws.getIo().to(event.path).emit("realtime:resource", {
      action,
      type: event.type,
      path: event.resourcePath,
      resource: event.entity
    });
  }
}