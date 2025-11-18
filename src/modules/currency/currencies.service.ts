import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, isValidObjectId } from 'mongoose';
import { Currency, CurrencyDocument } from './schemas/currency.schema';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import {
  UpdateCurrencyDto,
  AdminCurrencyQueryDto,
  PublicCurrencyQueryDto,
} from './dto/update-currency.dto';
import { I18nService } from 'nestjs-i18n';
import { createPaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectModel(Currency.name)
    private currencyModel: Model<CurrencyDocument>,
    private readonly i18n: I18nService,
  ) {}

  private buildSearchFilter(
    search?: string,
  ): FilterQuery<CurrencyDocument>[] | undefined {
    if (!search) return undefined;
    const regex = new RegExp(search, 'i');
    return [{ 'name.en': regex }, { 'name.ar': regex }, { symbol: regex }];
  }

  async create(dto: CreateCurrencyDto): Promise<Currency> {
    // Check if symbol already exists
    const existing = await this.currencyModel.findOne({
      symbol: dto.symbol,
      deletedAt: null,
    });
    if (existing) {
      throw new ConflictException(
        this.i18n.t('common.errors.currency_symbol_exists'),
      );
    }

    const currency = new this.currencyModel(dto);
    return currency.save();
  }

  async update(id: string, dto: UpdateCurrencyDto): Promise<Currency> {
    const existing = await this.currencyModel.findOne({ _id: id });
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }

    // Check for symbol conflict if updating symbol
    if (dto.symbol && dto.symbol !== existing.symbol) {
      const symbolExists = await this.currencyModel.findOne({
        symbol: dto.symbol,
        deletedAt: null,
        _id: { $ne: id },
      });
      if (symbolExists) {
        throw new ConflictException(
          this.i18n.t('common.errors.currency_symbol_exists'),
        );
      }
    }

    const update: Record<string, unknown> = {};
    if (dto.name) {
      if (dto.name.en !== undefined) update['name.en'] = dto.name.en;
      if (dto.name.ar !== undefined) update['name.ar'] = dto.name.ar;
    }
    if (dto.symbol !== undefined) update['symbol'] = dto.symbol;
    if (dto.isActive !== undefined) update['isActive'] = dto.isActive;

    const currency = await this.currencyModel.findOneAndUpdate(
      { _id: id },
      { $set: update },
      { new: true },
    );

    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }

    return currency;
  }

  async softDelete(id: string): Promise<void> {
    const currency = await this.currencyModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );
    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found_or_deleted'),
      );
    }
  }

  async toggleActivation(id: string, isActive: boolean): Promise<Currency> {
    const currency = await this.currencyModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { isActive } },
      { new: true },
    );
    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found_or_deleted'),
      );
    }
    return currency;
  }

  async findAllAdmin(query: AdminCurrencyQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const baseFilter: FilterQuery<CurrencyDocument> = {};
    const andConditions: FilterQuery<CurrencyDocument>[] = [baseFilter];

    if (query.deletedOnly) {
      andConditions.push({ deletedAt: { $ne: null } });
    } else if (!query.includeDeleted) {
      andConditions.push({ deletedAt: null });
    }

    if (query.isActive !== undefined) {
      andConditions.push({ isActive: query.isActive });
    }

    const orFilter = this.buildSearchFilter(query.search);
    const andFilter =
      andConditions.length > 1 ? { $and: andConditions } : baseFilter;
    const mongoFilter = orFilter
      ? { $and: [andFilter], $or: orFilter }
      : andFilter;

    const currencies = await this.currencyModel
      .find(mongoFilter)
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.currencyModel.countDocuments(mongoFilter);
    return createPaginatedResponse(currencies, page, limit, total);
  }

  async findOneAdmin(id: string): Promise<Currency> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }
    const currency = await this.currencyModel.findOne({ _id: id });
    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }
    return currency;
  }

  async findAllPublic(query: PublicCurrencyQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const filter: FilterQuery<CurrencyDocument> = {
      isActive: true,
      deletedAt: null,
    };

    const orFilter = this.buildSearchFilter(query.search);
    const mongoFilter = orFilter ? { $and: [filter], $or: orFilter } : filter;

    const currencies = await this.currencyModel
      .find(mongoFilter)
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.currencyModel.countDocuments(mongoFilter);
    return createPaginatedResponse(currencies, page, limit, total);
  }

  async findOnePublic(id: string): Promise<Currency> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }
    const currency = await this.currencyModel.findOne({
      _id: id,
      isActive: true,
      deletedAt: null,
    });
    if (!currency) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_found'),
      );
    }
    return currency;
  }
}
