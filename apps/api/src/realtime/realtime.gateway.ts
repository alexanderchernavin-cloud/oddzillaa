import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { ENV_TOKEN } from '../config/config.module';
import type { Env } from '../config/env.schema';

@WebSocketGateway({
  cors: {
    origin: (process.env.WEB_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private subscriber: Redis;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly jwt: JwtService,
  ) {
    this.subscriber = redis.duplicate();
  }

  afterInit(): void {
    this.subscriber.psubscribe('match:*', 'ticket:*', (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to patterns: ${err.message}`);
        return;
      }
      this.logger.log('Redis pub/sub: subscribed to match:* and ticket:* patterns');
    });

    this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      if (channel.startsWith('ticket:')) {
        this.server.to(channel).emit('ticket.update', message);
      } else {
        this.server.to(channel).emit('match.update', message);
      }
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth as Record<string, string>)?.token ??
      client.handshake.headers.authorization?.replace('Bearer ', '');

    let authenticated = false;
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync(token, {
          secret: this.env.JWT_ACCESS_SECRET,
        });
        client.data.userId = payload.sub;
        client.data.role = payload.role;
        authenticated = true;

        const ticketRoom = `ticket:${payload.sub}`;
        client.join(ticketRoom);
      } catch {
        // invalid token -- still allow connection for public reads
      }
    }
    client.data.authenticated = authenticated;
    this.logger.debug(`Client connected: ${client.id} (authenticated=${authenticated})`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber.punsubscribe('match:*', 'ticket:*');
    await this.subscriber.quit();
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() matchId: string,
  ): void {
    const room = `match:${matchId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined room ${room}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() matchId: string,
  ): void {
    const room = `match:${matchId}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} left room ${room}`);
  }
}
