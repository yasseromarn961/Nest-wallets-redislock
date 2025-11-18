import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types, isValidObjectId } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { createPaginatedResponse } from '../../common/dto/pagination.dto';

export interface LogsQuery {
  page?: number;
  limit?: number;
  level?: string;
  requestId?: string;
  context?: string;
  event?: string;
  message?: string;
  search?: string;
  from?: string; // ISO date
  to?: string; // ISO date
  method?: string;
  statusCode?: number;
  url?: string;
  service?: string;
  env?: string;
  ip?: string;
  lang?: string;
  orderBy?: 'timestamp' | 'statusCode' | 'level';
  orderDirection?: 'asc' | 'desc';
}

@Injectable()
export class LogsService implements OnModuleInit {
  private readonly collectionName: string;
  private readonly ttlDays: number;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {
    this.collectionName =
      this.configService.get<string>('logger.mongo.collection') ||
      'winston_logs';
    this.ttlDays = this.configService.get<number>('logger.mongo.ttlDays') ?? 14;
  }

  // Use the driver's inferred types from Mongoose's bundled MongoDB to avoid cross-package type mismatches
  private get collection() {
    return this.connection.db!.collection(this.collectionName);
  }

  async onModuleInit() {
    // Ensure indexes including TTL, in case the transport cannot create them
    const expireAfterSeconds = Math.max(1, this.ttlDays) * 24 * 60 * 60;
    await this.collection.createIndex(
      { timestamp: 1 },
      { expireAfterSeconds, background: true },
    );
    await this.collection.createIndex(
      { level: 1, timestamp: -1 },
      { background: true },
    );
    await this.collection.createIndex(
      { requestId: 1, timestamp: -1 },
      { background: true },
    );
    await this.collection.createIndex(
      { event: 1, timestamp: -1 },
      { background: true },
    );
    await this.collection.createIndex(
      { statusCode: 1, timestamp: -1 },
      { background: true },
    );
  }

  async list(query: LogsQuery): Promise<{
    items: Record<string, unknown>[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  }> {
    const filter: Record<string, unknown> = {};

    // Exact filters
    if (query.level) filter.level = query.level;
    if (query.requestId) filter.requestId = query.requestId;
    if (query.context) filter.context = query.context;
    if (query.event) filter.event = query.event;
    if (query.method) filter.method = query.method;
    if (typeof query.statusCode === 'number')
      filter.statusCode = query.statusCode;
    if (query.service) filter.service = query.service;
    if (query.env) filter.env = query.env;
    if (query.ip) filter.ip = query.ip;
    if (query.lang) filter.lang = query.lang;

    // Partial match filters
    if (query.message)
      filter.message = { $regex: query.message, $options: 'i' };
    if (query.url) filter.url = { $regex: query.url, $options: 'i' };

    // Date range
    const dateFilter: Record<string, Date> = {};
    if (query.from) dateFilter.$gte = new Date(query.from);
    if (query.to) dateFilter.$lte = new Date(query.to);
    if (Object.keys(dateFilter).length) {
      // Assign via index signature to avoid unnecessary type assertions
      filter['timestamp'] = dateFilter as unknown;
    }

    // Keyword search across common fields
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [
        { message: { $regex: regex } },
        { 'error.message': { $regex: regex } },
        { url: { $regex: regex } },
        { context: { $regex: regex } },
        { event: { $regex: regex } },
      ];
    }

    // Pagination (0-indexed page)
    const page = Math.max(0, query.page ?? 0);
    const limit = Math.min(200, Math.max(1, query.limit ?? 20));
    const skip = page * limit;

    // Sorting
    const sortField = (query.orderBy ?? 'timestamp') as string;
    const sortDir = query.orderDirection === 'asc' ? 1 : -1;

    const cursor = this.collection
      .find(filter, { projection: { stack: 0 } })
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limit);

    const [items, total] = await Promise.all([
      cursor.toArray(),
      this.collection.countDocuments(filter),
    ]);

    return createPaginatedResponse(items, page, limit, total);
  }

  async getById(id: string): Promise<Record<string, unknown> | null> {
    // Accept hex string ObjectId; if not valid, return null to avoid type mismatches
    if (!isValidObjectId(id)) return null;
    // Use Mongoose's Types.ObjectId to ensure BSON type compatibility with the active connection
    const filter: Record<string, unknown> = { _id: new Types.ObjectId(id) };
    const doc = await this.collection.findOne(filter);
    return doc ?? null;
  }
}
