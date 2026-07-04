import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';

interface AuthSocket extends Socket {
  userId: string;
  companyId: string;
  userName: string;
  userAvatar?: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Connection auth ────────────────────────────────────────────────────────

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });

      client.userId    = payload.sub;
      client.companyId = payload.companyId;
      client.userName  = payload.name;
      client.userAvatar = payload.avatarUrl;

      await this.chatService.setOnline(client.userId);

      // join company room to receive broadcast events
      client.join(`company:${client.companyId}`);

      // broadcast new online user
      this.server.to(`company:${client.companyId}`).emit('presence:online', {
        userId: client.userId,
        name: client.userName,
        avatarUrl: client.userAvatar,
      });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthSocket) {
    if (!client.userId) return;
    await this.chatService.setOffline(client.userId);
    this.server.to(`company:${client.companyId}`).emit('presence:offline', {
      userId: client.userId,
    });
  }

  // ── Room join/leave ────────────────────────────────────────────────────────

  @SubscribeMessage('room:join')
  async onJoinRoom(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string },
  ) {
    client.join(`room:${data.roomId}`);
    await this.chatService.markRead(data.roomId, client.userId);
    const messages = await this.chatService.getMessages(data.roomId);
    return { event: 'room:history', data: messages };
  }

  @SubscribeMessage('room:leave')
  onLeaveRoom(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string },
  ) {
    client.leave(`room:${data.roomId}`);
  }

  // ── Messaging ──────────────────────────────────────────────────────────────

  @SubscribeMessage('message:send')
  async onSendMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string; content: string },
  ) {
    if (!data.content?.trim()) return;
    const message = await this.chatService.createMessage(
      data.roomId, client.userId, data.content.trim(),
    );
    this.server.to(`room:${data.roomId}`).emit('message:new', message);
    return message;
  }

  @SubscribeMessage('message:edit')
  async onEditMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    const updated = await this.chatService.editMessage(
      data.messageId, client.userId, data.content,
    );
    this.server.to(`room:${updated.roomId}`).emit('message:updated', updated);
    return updated;
  }

  @SubscribeMessage('message:delete')
  async onDeleteMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { messageId: string; roomId: string },
  ) {
    await this.chatService.deleteMessage(data.messageId, client.userId);
    this.server.to(`room:${data.roomId}`).emit('message:deleted', {
      messageId: data.messageId,
      roomId: data.roomId,
    });
  }

  // ── Typing indicator ───────────────────────────────────────────────────────

  @SubscribeMessage('typing:start')
  onTypingStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string },
  ) {
    client.to(`room:${data.roomId}`).emit('typing:start', {
      userId: client.userId,
      name: client.userName,
    });
  }

  @SubscribeMessage('typing:stop')
  onTypingStop(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { roomId: string },
  ) {
    client.to(`room:${data.roomId}`).emit('typing:stop', { userId: client.userId });
  }

  // ── Presence refresh ──────────────────────────────────────────────────────

  @SubscribeMessage('presence:ping')
  async onPresencePing(@ConnectedSocket() client: AuthSocket) {
    await this.chatService.setOnline(client.userId);
  }

  // ── Load more messages ────────────────────────────────────────────────────

  @SubscribeMessage('messages:load-more')
  async onLoadMore(
    @ConnectedSocket() _client: AuthSocket,
    @MessageBody() data: { roomId: string; before: string },
  ) {
    const messages = await this.chatService.getMessages(data.roomId, 50, data.before);
    return { event: 'messages:history-chunk', data: messages };
  }
}
