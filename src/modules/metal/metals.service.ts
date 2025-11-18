import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types, isValidObjectId } from 'mongoose';
import { Metal, MetalDocument, CurrencyPrice } from './schemas/metal.schema';
import { CreateMetalDto } from './dto/create-metal.dto';
import {
  UpdateMetalDto,
  AdminMetalQueryDto,
  PublicMetalQueryDto,
  PublicMetalByCurrencyQueryDto,
  AdminMetalByCurrencyQueryDto,
} from './dto/update-metal.dto';
import { I18nService } from 'nestjs-i18n';
import {
  Currency,
  CurrencyDocument,
} from '../currency/schemas/currency.schema';
import { createPaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class MetalsService {
  constructor(
    @InjectModel(Metal.name)
    private metalModel: Model<MetalDocument>,
    @InjectModel(Currency.name)
    private currencyModel: Model<CurrencyDocument>,
    private readonly i18n: I18nService,
  ) {}

  // Safely extract a string ID from currencyId which may be a string, Types.ObjectId, or a populated object
  private extractCurrencyId(cid: unknown): string | undefined {
    if (!cid) return undefined;
    if (typeof cid === 'string') return cid;
    if (cid instanceof Types.ObjectId) return cid.toHexString();
    if (typeof cid === 'object') {
      const obj = cid as { id?: unknown; _id?: unknown };
      if (typeof obj.id === 'string') return obj.id;
      const _id = obj._id;
      if (typeof _id === 'string') return _id;
      if (_id instanceof Types.ObjectId) return _id.toHexString();
    }
    return undefined;
  }

  private async validateCurrencies(
    currencies?: Array<{
      currencyId: string;
      price: number;
      currencyActive?: boolean;
    }>,
  ): Promise<void> {
    if (!currencies || currencies.length === 0) return;

    const currencyIds = currencies.map((c) => c.currencyId);
    const uniqueIds = [...new Set(currencyIds)];

    if (uniqueIds.length !== currencyIds.length) {
      throw new BadRequestException(
        this.i18n.t('common.errors.duplicate_currency_in_metal'),
      );
    }

    // Validate all currencies exist and are active
    for (const currencyId of uniqueIds) {
      if (!isValidObjectId(currencyId)) {
        throw new BadRequestException(
          this.i18n.t('common.errors.invalid_currency_id'),
        );
      }
      const currency = await this.currencyModel.findOne({
        _id: currencyId,
        isActive: true,
        deletedAt: null,
      });
      if (!currency) {
        throw new NotFoundException(
          this.i18n.t('common.errors.currency_not_found_or_inactive'),
        );
      }
    }
  }

  private buildSearchFilter(
    search?: string,
  ): FilterQuery<MetalDocument>[] | undefined {
    if (!search) return undefined;
    const regex = new RegExp(search, 'i');
    return [{ 'name.en': regex }, { 'name.ar': regex }, { symbol: regex }];
  }

  async create(dto: CreateMetalDto): Promise<Metal> {
    // Check for existing metal with the same symbol and purity
    const duplicate = await this.metalModel.findOne({
      symbol: dto.symbol,
      purity: dto.purity,
      deletedAt: null,
    });
    if (duplicate) {
      throw new ConflictException(
        this.i18n.t('common.errors.metal_exists_with_same_purity'),
      );
    }
    // As per new requirements, currencies should not be passed on creation
    // Initialize currencies to null and manage them via dedicated currency APIs
    const metal = new this.metalModel({
      ...dto,
      currencies: null,
    });
    return metal.save();
  }

  async update(id: string, dto: UpdateMetalDto): Promise<Metal> {
    const existing = await this.metalModel.findOne({ _id: id });
    if (!existing) {
      throw new NotFoundException(this.i18n.t('common.errors.metal_not_found'));
    }

    const update: Record<string, unknown> = {};
    if (dto.name) {
      if (dto.name.en !== undefined) update['name.en'] = dto.name.en;
      if (dto.name.ar !== undefined) update['name.ar'] = dto.name.ar;
    }
    if (dto.symbol !== undefined) update['symbol'] = dto.symbol;
    if (dto.purity !== undefined) update['purity'] = dto.purity;
    if (dto.isActive !== undefined) update['isActive'] = dto.isActive;

    const metal = await this.metalModel.findOneAndUpdate(
      { _id: id },
      { $set: update },
      { new: true },
    );

    if (!metal) {
      throw new NotFoundException(this.i18n.t('common.errors.metal_not_found'));
    }

    return metal;
  }

  async addCurrencyPricing(
    metalId: string,
    data: { currencyId: string; price: number; currencyActive?: boolean },
  ): Promise<Metal> {
    if (!isValidObjectId(metalId)) {
      throw new BadRequestException(this.i18n.t('common.errors.invalid_id'));
    }

    // Validate currency exists and is active
    await this.validateCurrencies([
      {
        currencyId: data.currencyId,
        price: data.price,
        currencyActive: data.currencyActive,
      },
    ]);

    const metal = await this.metalModel.findOne({
      _id: metalId,
      deletedAt: null,
    });
    if (!metal) {
      throw new NotFoundException(
        this.i18n.t('common.errors.metal_not_found_or_deleted'),
      );
    }

    // Ensure currencies array is initialized
    if (!Array.isArray(metal.currencies)) {
      // If null or undefined, initialize as empty array with proper typing
      metal.currencies = [] as CurrencyPrice[];
    }

    // Prevent duplicate currency linkage
    const exists = metal.currencies.some(
      (c) => String(c.currencyId) === String(data.currencyId),
    );
    if (exists) {
      throw new BadRequestException(
        this.i18n.t('common.errors.duplicate_currency_in_metal'),
      );
    }

    metal.currencies.push({
      currencyId: new Types.ObjectId(data.currencyId),
      price: data.price,
      currencyActive: data.currencyActive ?? true,
    });
    await metal.save();
    return metal;
  }

  async toggleActivation(id: string, isActive: boolean): Promise<Metal> {
    const metal = await this.metalModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { isActive } },
      { new: true },
    );
    if (!metal) {
      throw new NotFoundException(
        this.i18n.t('common.errors.metal_not_found_or_deleted'),
      );
    }
    return metal;
  }

  async toggleCurrencyActivation(
    metalId: string,
    currencyId: string,
    currencyActive: boolean,
    price?: number,
  ): Promise<Metal> {
    if (!isValidObjectId(metalId) || !isValidObjectId(currencyId)) {
      throw new BadRequestException(this.i18n.t('common.errors.invalid_id'));
    }

    const metal = await this.metalModel.findOne({
      _id: metalId,
      deletedAt: null,
    });

    if (!metal) {
      throw new NotFoundException(
        this.i18n.t('common.errors.metal_not_found_or_deleted'),
      );
    }

    // Ensure currencies array is valid
    if (!Array.isArray(metal.currencies)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_in_metal'),
      );
    }

    const currencyIndex = metal.currencies.findIndex(
      (c) => String(c.currencyId) === String(currencyId),
    );

    if (currencyIndex === -1) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_in_metal'),
      );
    }

    metal.currencies[currencyIndex].currencyActive = currencyActive;
    if (price !== undefined) {
      metal.currencies[currencyIndex].price = price;
    }
    await metal.save();

    return metal;
  }

  async softDelete(id: string): Promise<void> {
    const metal = await this.metalModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );
    if (!metal) {
      throw new NotFoundException(
        this.i18n.t('common.errors.metal_not_found_or_deleted'),
      );
    }
  }

  async findAllAdmin(query: AdminMetalQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const baseFilter: FilterQuery<MetalDocument> = {};
    const andConditions: FilterQuery<MetalDocument>[] = [baseFilter];

    if (query.isDeleted === true) {
      andConditions.push({ deletedAt: { $ne: null } });
    } else if (query.isDeleted === false) {
      andConditions.push({ deletedAt: null });
    }

    if (query.isActive !== undefined) {
      andConditions.push({ isActive: query.isActive });
    }

    if (query.id) {
      if (!isValidObjectId(query.id)) {
        return createPaginatedResponse([], page, limit, 0);
      }
      andConditions.push({ _id: new Types.ObjectId(query.id) });
    }

    if (query.symbol) {
      const regex = new RegExp(query.symbol, 'i');
      andConditions.push({ symbol: regex });
    }

    if (query.currencyId) {
      if (!isValidObjectId(query.currencyId)) {
        return createPaginatedResponse([], page, limit, 0);
      }
      andConditions.push({
        'currencies.currencyId': new Types.ObjectId(query.currencyId),
      });
    }

    const orFilter = this.buildSearchFilter(query.search);
    const andFilter =
      andConditions.length > 1 ? { $and: andConditions } : baseFilter;
    const mongoFilter = orFilter
      ? { $and: [andFilter], $or: orFilter }
      : andFilter;

    const metalsQuery = this.metalModel
      .find(mongoFilter)
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit);

    if (query.currencyId) {
      metalsQuery.populate('currencies.currencyId');
    }

    const metals = await metalsQuery.exec();

    // Post-process: if currencyId provided, keep only the matched currency entry in array
    let normalized = metals;
    if (query.currencyId) {
      const currencyIdStr = String(query.currencyId);
      normalized = metals.map((m) => {
        if (Array.isArray(m.currencies)) {
          m.currencies = m.currencies.filter((c) => {
            const idStr = this.extractCurrencyId(c.currencyId as unknown);
            return idStr === currencyIdStr;
          });
        }
        return m;
      });
    }

    const total = await this.metalModel.countDocuments(mongoFilter);
    return createPaginatedResponse(normalized, page, limit, total);
  }

  async findOneAdmin(id: string): Promise<Metal> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(this.i18n.t('common.errors.metal_not_found'));
    }
    const metal = await this.metalModel.findOne({ _id: id });
    if (!metal) {
      throw new NotFoundException(this.i18n.t('common.errors.metal_not_found'));
    }
    return metal;
  }

  async findAllPublic(query: PublicMetalQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const filter: FilterQuery<MetalDocument> = {
      isActive: true,
      deletedAt: null,
    };

    if (query.id) {
      if (!isValidObjectId(query.id)) {
        return createPaginatedResponse([], page, limit, 0);
      }
      filter._id = new Types.ObjectId(query.id);
    }

    if (query.symbol) {
      const regex = new RegExp(query.symbol, 'i');
      filter.symbol = regex;
    }

    if (query.currencyId) {
      if (!isValidObjectId(query.currencyId)) {
        return createPaginatedResponse([], page, limit, 0);
      }
      filter['currencies.currencyId'] = new Types.ObjectId(query.currencyId);
    }

    const orFilter = this.buildSearchFilter(query.search);
    const mongoFilter = orFilter ? { $and: [filter], $or: orFilter } : filter;

    const metalsQuery = this.metalModel
      .find(mongoFilter)
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit);

    if (query.currencyId) {
      metalsQuery.populate('currencies.currencyId');
    }

    const metals = await metalsQuery.exec();

    // Post-process: if currencyId provided, keep only the matched currency entry in array
    let normalized = metals;
    if (query.currencyId) {
      const currencyIdStr = String(query.currencyId);
      normalized = metals.map((m) => {
        if (Array.isArray(m.currencies)) {
          m.currencies = m.currencies.filter((c) => {
            const idStr = this.extractCurrencyId(c.currencyId as unknown);
            return idStr === currencyIdStr;
          });
        }
        return m;
      });
    }

    const total = await this.metalModel.countDocuments(mongoFilter);
    return createPaginatedResponse(normalized, page, limit, total);
  }

  async findOnePublic(id: string): Promise<Metal> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(this.i18n.t('common.errors.metal_not_found'));
    }
    const metal = await this.metalModel.findOne({
      _id: id,
      isActive: true,
      deletedAt: null,
    });
    if (!metal) {
      throw new NotFoundException(this.i18n.t('common.errors.metal_not_found'));
    }
    return metal;
  }

  async findByCurrency(
    currencyId: string,
    query: PublicMetalByCurrencyQueryDto,
  ) {
    if (!isValidObjectId(currencyId)) {
      throw new BadRequestException(
        this.i18n.t('common.errors.invalid_currency_id'),
      );
    }

    // Validate currency exists and is active
    const currency = await this.currencyModel.findOne({
      _id: currencyId,
      isActive: true,
      deletedAt: null,
    });
    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found_or_inactive'),
      );
    }

    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const filter: FilterQuery<MetalDocument> = {
      isActive: true,
      deletedAt: null,
      'currencies.currencyId': new Types.ObjectId(currencyId),
      'currencies.currencyActive': true,
    };

    const metals = await this.metalModel
      .find(filter)
      .populate('currencies.currencyId')
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    // Post-process: keep only the matched currency entry and ensure active state
    const currencyIdStr = String(currencyId);
    const normalized = metals.map((m) => {
      if (Array.isArray(m.currencies)) {
        m.currencies = m.currencies.filter((c) => {
          const idStr = this.extractCurrencyId(c.currencyId as unknown);
          return idStr === currencyIdStr && c.currencyActive === true;
        });
      }
      return m;
    });

    const total = await this.metalModel.countDocuments(filter);
    return createPaginatedResponse(normalized, page, limit, total);
  }

  async findByCurrencyAdmin(
    currencyId: string,
    query: AdminMetalByCurrencyQueryDto,
  ) {
    if (!isValidObjectId(currencyId)) {
      throw new BadRequestException(
        this.i18n.t('common.errors.invalid_currency_id'),
      );
    }

    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    let filter: FilterQuery<MetalDocument> = {
      'currencies.currencyId': new Types.ObjectId(currencyId),
    };

    if (query.currencyActive === true || query.currencyActive === false) {
      filter = {
        currencies: {
          $elemMatch: {
            currencyId: new Types.ObjectId(currencyId),
            currencyActive: query.currencyActive,
          },
        },
      } as FilterQuery<MetalDocument>;
    }

    const metals = await this.metalModel
      .find(filter)
      .populate('currencies.currencyId')
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    // Post-process: keep only the matched currency entry; respect currencyActive filter when provided
    const currencyIdStr = String(currencyId);
    const normalized = metals.map((m) => {
      if (Array.isArray(m.currencies)) {
        m.currencies = m.currencies.filter((c) => {
          const idStr = this.extractCurrencyId(c.currencyId as unknown);
          let match = idStr === currencyIdStr;
          if (query.currencyActive === true || query.currencyActive === false) {
            match = match && c.currencyActive === query.currencyActive;
          }
          return match;
        });
      }
      return m;
    });

    const total = await this.metalModel.countDocuments(filter);
    return createPaginatedResponse(normalized, page, limit, total);
  }
}
