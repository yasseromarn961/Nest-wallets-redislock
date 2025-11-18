import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection, ClientSession } from 'mongoose';

@Injectable()
export class MongoService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getConnection(): Connection {
    return this.connection;
  }

  async startSession(): Promise<ClientSession> {
    return this.connection.startSession();
  }

  async withTransaction<T>(
    fn: (session: ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }
}
