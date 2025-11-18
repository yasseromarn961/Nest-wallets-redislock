import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, isValidObjectId } from 'mongoose';
import { Country, CountryDocument } from './schemas/country.schema';
import { CreateCountryDto } from './dto/create-country.dto';
import {
  UpdateCountryDto,
  AdminCountryQueryDto,
  PublicCountryQueryDto,
} from './dto/update-country.dto';
import { I18nService } from 'nestjs-i18n';
import { createPaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class CountriesService {
  constructor(
    @InjectModel(Country.name) private countryModel: Model<CountryDocument>,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: CreateCountryDto): Promise<Country> {
    // Ensure code uniqueness among non-deleted records
    const existing = await this.countryModel.findOne({
      code: dto.code.toUpperCase(),
      deletedAt: null,
    });
    if (existing) {
      throw new ConflictException(
        this.i18n.t('common.errors.country_code_exists'),
      );
    }

    const country = new this.countryModel({
      ...dto,
      code: dto.code.toUpperCase(),
    });
    return country.save();
  }

  async update(id: string, dto: UpdateCountryDto): Promise<Country> {
    const update: Record<string, unknown> = {};
    if (dto.name) {
      if (dto.name.en !== undefined) update['name.en'] = dto.name.en;
      if (dto.name.ar !== undefined) update['name.ar'] = dto.name.ar;
    }
    if (dto.code !== undefined) update['code'] = dto.code.toUpperCase();
    if (dto.dialCode !== undefined) update['dialCode'] = dto.dialCode;
    if (dto.flagImageUrl !== undefined)
      update['flagImageUrl'] = dto.flagImageUrl;
    if (dto.isActive !== undefined) update['isActive'] = dto.isActive;

    const country = await this.countryModel.findOneAndUpdate(
      { _id: id },
      { $set: update },
      { new: true },
    );

    if (!country) {
      throw new NotFoundException(
        this.i18n.t('common.errors.country_not_found'),
      );
    }

    return country;
  }

  async softDelete(id: string): Promise<void> {
    const country = await this.countryModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );
    if (!country) {
      throw new NotFoundException(
        this.i18n.t('common.errors.country_not_found_or_deleted'),
      );
    }
  }

  private buildSearchFilter(
    search?: string,
  ): FilterQuery<CountryDocument>[] | undefined {
    if (!search) return undefined;
    const regex = new RegExp(search, 'i');
    return [
      { 'name.en': regex },
      { 'name.ar': regex },
      { code: regex },
      { dialCode: regex },
    ];
  }

  async findAllAdmin(query: AdminCountryQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const baseFilter: FilterQuery<CountryDocument> = {};
    const andConditions: FilterQuery<CountryDocument>[] = [baseFilter];
    if (query.deletedOnly) {
      andConditions.push({ deletedAt: { $ne: null } });
    } else if (!query.includeDeleted) {
      andConditions.push({ deletedAt: null });
    }
    if (query.isActive !== undefined) {
      andConditions.push({ isActive: query.isActive });
    }
    if (query.code) {
      andConditions.push({ code: query.code.toUpperCase() });
    }
    if (query.dialCode) {
      andConditions.push({ dialCode: query.dialCode });
    }

    const orFilter = this.buildSearchFilter(query.search);
    const andFilter =
      andConditions.length > 1 ? { $and: andConditions } : baseFilter;
    const mongoFilter = orFilter
      ? { $and: [andFilter], $or: orFilter }
      : andFilter;

    const countries = await this.countryModel
      .find(mongoFilter)
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.countryModel.countDocuments(mongoFilter);
    return createPaginatedResponse(countries, page, limit, total);
  }

  async findOneAdmin(id: string): Promise<Country> {
    // Validate ObjectId early to avoid CastError and return consistent 404
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.country_not_found'),
      );
    }
    const country = await this.countryModel.findOne({ _id: id });
    if (!country) {
      throw new NotFoundException(
        this.i18n.t('common.errors.country_not_found'),
      );
    }
    return country;
  }

  async findAllPublic(query: PublicCountryQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const filter: FilterQuery<CountryDocument> = {
      isActive: true,
      deletedAt: null,
    };

    const orFilter = this.buildSearchFilter(query.search);
    const mongoFilter = orFilter ? { $and: [filter], $or: orFilter } : filter;

    const countries = await this.countryModel
      .find(mongoFilter)
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.countryModel.countDocuments(mongoFilter);
    return createPaginatedResponse(countries, page, limit, total);
  }

  async findOnePublic(id: string): Promise<Country> {
    // Validate ObjectId early to avoid CastError and return consistent 404
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.country_not_found'),
      );
    }
    const country = await this.countryModel.findOne({
      _id: id,
      isActive: true,
      deletedAt: null,
    });
    if (!country) {
      throw new NotFoundException(
        this.i18n.t('common.errors.country_not_found'),
      );
    }
    return country;
  }
}
