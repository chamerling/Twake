import { logger } from "../../logger";
import { JoinLeaveRoomError, JoinLeaveRoomSuccess, JoinRoomEvent, LeaveRoomEvent } from "../types";
import { RealtimeRoomManager } from "../api";
import WebSocketAPI from "../../../services/websocket/provider";
import { WebSocketUser, WebSocket } from "../../../services/websocket/types";

export default class RoomManager implements RealtimeRoomManager {
  constructor(private ws: WebSocketAPI) {}

  init(): void {
    this.ws.onUserConnected(event => {
      logger.info(`User ${event.user._id} is connected`);

      event.socket.on("realtime:join", async (joinEvent: JoinRoomEvent) => {
        const canJoin = await this.userCanJoinRoom(event.user, joinEvent);

        if (canJoin) {
          this.join(event.socket, joinEvent.name, event.user);
        } else {
          this.sendError("join", event.socket, {
            name: joinEvent.name,
            message: "User is not authorized to join room"
          });
        }
      });

      event.socket.on("realtime:leave", (leaveEvent: LeaveRoomEvent) => {
        this.leave(event.socket, leaveEvent.name, event.user);
      });
    });

    this.ws.onUserDisconnected(event => {
      logger.info(`User ${event.user._id} is disconnected`);
      this.leaveAll(event.socket, event.user);
    });
  }

  getConnectedUsers(room: string): number {
    if (this.ws.getIo().sockets.adapter.rooms[room]) {
      return this.ws.getIo().sockets.adapter.rooms[room].length;
    }

    return 0;
  }

  /**
   * Check of the user can join room
   *
   * @param user
   * @param joinEvent
   * @return Promise<boolean> true if can join, false otherwise. Never rejects.
   */
  async userCanJoinRoom(user: WebSocketUser, joinEvent: JoinRoomEvent): Promise<boolean> {
    logger.info(`Checking if user ${user._id} can join room ${joinEvent.name}`);

    // FIXME: We will use JWT to validate the token
    return joinEvent.token && joinEvent.token === "twake";
  }

  join(websocket: WebSocket, room: string, user: WebSocketUser): void {
    logger.info(`User ${user._id} is joining room ${room}`);
    websocket.join(room, err => {
      if (err) {
        logger.error(`Error while joining room ${room}`, err);
        this.sendError("join", websocket, {
          name: room,
          message: "Error while joining room"
         });
        return;
      }

      this.sendSuccess("join", websocket, { name: room });
      logger.info(`User ${user._id} joined room ${room}`);
    });
  }

  leave(websocket: WebSocket, room: string, user: WebSocketUser): void {
    logger.info(`User ${user._id} is leaving room ${room}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    websocket.leave(room, (err: any) => {
      if (err) {
        logger.error(`Error while leaving room ${room}`, err);
        this.sendError("leave", websocket, {
          name: room,
          message: "Error while leaving room"
         });
        return;
      }

      this.sendSuccess("leave", websocket, { name: room });
      logger.info(`User ${user._id} left room ${room}`);
    });
  }

  leaveAll(websocket: WebSocket, user: WebSocketUser): void {
    logger.info(`Leaving rooms for user ${user._id}`);
    websocket.leaveAll();
  }

  sendError(event: string, websocket: WebSocket, error: JoinLeaveRoomError): void {
    websocket.emit(`realtime:${event}:error`, error);
  }

  sendSuccess(event: string, websocket: WebSocket, success: JoinLeaveRoomSuccess): void {
    websocket.emit(`realtime:${event}:success`, success);
  }
}