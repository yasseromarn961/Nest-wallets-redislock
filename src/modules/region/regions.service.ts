import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types, isValidObjectId } from 'mongoose';
import { Region, RegionDocument } from './schemas/region.schema';
import { CreateRegionDto } from './dto/create-region.dto';
import {
  UpdateRegionDto,
  AdminRegionQueryDto,
  PublicRegionQueryDto,
} from './dto/update-region.dto';
import { I18nService } from 'nestjs-i18n';
import { Country, CountryDocument } from '../country/schemas/country.schema';
import { createPaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class RegionsService {
  constructor(
    @InjectModel(Region.name) private regionModel: Model<RegionDocument>,
    @InjectModel(Country.name) private countryModel: Model<CountryDocument>,
    private readonly i18n: I18nService,
  ) {}

  private async assertCountryActiveAndPresent(
    countryId: string,
  ): Promise<void> {
    const countryObjectId = new Types.ObjectId(countryId);
    const country = await this.countryModel.findOne({
      _id: countryObjectId,
      isActive: true,
      deletedAt: null,
    });
    if (!country) {
      throw new NotFoundException(
        this.i18n.t('common.errors.country_not_found_or_deleted'),
      );
    }
  }

  private buildSearchFilter(
    search?: string,
  ): FilterQuery<RegionDocument>[] | undefined {
    if (!search) return undefined;
    const regex = new RegExp(search, 'i');
    return [{ 'name.en': regex }, { 'name.ar': regex }];
  }

  async create(dto: CreateRegionDto): Promise<Region> {
    await this.assertCountryActiveAndPresent(dto.countryId);
    const region = new this.regionModel({
      ...dto,
      countryId: new Types.ObjectId(dto.countryId),
    });
    return region.save();
  }

  async update(id: string, dto: UpdateRegionDto): Promise<Region> {
    const update: Record<string, unknown> = {};
    if (dto.name) {
      if (dto.name.en !== undefined) update['name.en'] = dto.name.en;
      if (dto.name.ar !== undefined) update['name.ar'] = dto.name.ar;
    }
    if (dto.countryId !== undefined) {
      await this.assertCountryActiveAndPresent(dto.countryId);
      update['countryId'] = new Types.ObjectId(dto.countryId);
    }
    if (dto.isActive !== undefined) update['isActive'] = dto.isActive;

    const region = await this.regionModel.findOneAndUpdate(
      { _id: id },
      { $set: update },
      { new: true },
    );

    if (!region) {
      throw new NotFoundException(
        this.i18n.t('common.errors.region_not_found'),
      );
    }

    return region;
  }

  async softDelete(id: string): Promise<void> {
    const region = await this.regionModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );
    if (!region) {
      throw new NotFoundException(
        this.i18n.t('common.errors.region_not_found_or_deleted'),
      );
    }
  }

  async findAllAdmin(query: AdminRegionQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;

    const baseFilter: FilterQuery<RegionDocument> = {};
    const andConditions: FilterQuery<RegionDocument>[] = [baseFilter];
    if (query.deletedOnly) {
      andConditions.push({ deletedAt: { $ne: null } });
    } else if (!query.includeDeleted) {
      andConditions.push({ deletedAt: null });
    }
    if (query.isActive !== undefined) {
      andConditions.push({ isActive: query.isActive });
    }
    if (query.countryId) {
      const oid = new Types.ObjectId(query.countryId);
      andConditions.push({
        countryId: { $in: [oid, String(query.countryId)] },
      });
    }

    const orFilter = this.buildSearchFilter(query.search);
    const andFilter =
      andConditions.length > 1 ? { $and: andConditions } : baseFilter;
    const mongoFilter = orFilter
      ? { $and: [andFilter], $or: orFilter }
      : andFilter;

    const sortDir = query.orderDirection === 'asc' ? 1 : -1;
    const regions = await this.regionModel
      .find(mongoFilter)
      .sort({ createdAt: sortDir })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.regionModel.countDocuments(mongoFilter);
    return createPaginatedResponse(regions, page, limit, total);
  }

  async findOneAdmin(id: string): Promise<Region> {
    // Validate ObjectId early to avoid CastError and return consistent 404
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.region_not_found'),
      );
    }
    const region = await this.regionModel.findOne({ _id: id });
    if (!region) {
      throw new NotFoundException(
        this.i18n.t('common.errors.region_not_found'),
      );
    }
    return region;
  }

  async findAllPublic(query: PublicRegionQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;

    const filter: FilterQuery<RegionDocument> = {
      isActive: true,
      deletedAt: null,
    };
    if (query.countryId) {
      const oid = new Types.ObjectId(query.countryId);
      filter.countryId = { $in: [oid, String(query.countryId)] };
    }

    const orFilter = this.buildSearchFilter(query.search);
    const mongoFilter = orFilter ? { $and: [filter], $or: orFilter } : filter;

    const sortDir = query.orderDirection === 'asc' ? 1 : -1;
    const regions = await this.regionModel
      .find(mongoFilter)
      .sort({ createdAt: sortDir })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.regionModel.countDocuments(mongoFilter);
    return createPaginatedResponse(regions, page, limit, total);
  }

  async findOnePublic(id: string): Promise<Region> {
    // Validate ObjectId early to avoid CastError and return consistent 404
    if (!isValidObjectId(id)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.region_not_found'),
      );
    }
    const region = await this.regionModel.findOne({
      _id: id,
      isActive: true,
      deletedAt: null,
    });
    if (!region) {
      throw new NotFoundException(
        this.i18n.t('common.errors.region_not_found'),
      );
    }
    return region;
  }
}
