import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types, isValidObjectId } from 'mongoose';
import { City, CityDocument } from './schemas/city.schema';
import { CreateCityDto } from './dto/create-city.dto';
import {
  UpdateCityDto,
  AdminCityQueryDto,
  PublicCityQueryDto,
} from './dto/update-city.dto';
import { I18nService } from 'nestjs-i18n';
import { Country, CountryDocument } from '../country/schemas/country.schema';
import { Region, RegionDocument } from '../region/schemas/region.schema';
import { createPaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class CitiesService {
  constructor(
    @InjectModel(City.name) private cityModel: Model<CityDocument>,
    @InjectModel(Country.name) private countryModel: Model<CountryDocument>,
    @InjectModel(Region.name) private regionModel: Model<RegionDocument>,
    private readonly i18n: I18nService,
  ) {}

  private async assertCountryActiveAndPresent(
    countryId: string,
  ): Promise<void> {
    const country = await this.countryModel.findOne({
      _id: countryId,
      isActive: true,
      deletedAt: null,
    });
    if (!country) {
      throw new NotFoundException(
        this.i18n.t('common.errors.country_not_found_or_deleted'),
      );
    }
  }

  private async assertRegionActivePresentAndBelongsToCountry(
    regionId: string,
    countryId: string,
  ): Promise<void> {
    const region = await this.regionModel.findOne({
      _id: regionId,
      isActive: true,
      deletedAt: null,
    });
    if (!region) {
      throw new NotFoundException(
        this.i18n.t('common.errors.region_not_found_or_deleted'),
      );
    }
    if (String(region.countryId) !== String(countryId)) {
      throw new BadRequestException(
        this.i18n.t('common.errors.region_country_mismatch'),
      );
    }
  }

  private buildSearchFilter(
    search?: string,
  ): FilterQuery<CityDocument>[] | undefined {
    if (!search) return undefined;
    const regex = new RegExp(search, 'i');
    return [{ 'name.en': regex }, { 'name.ar': regex }];
  }

  async create(dto: CreateCityDto): Promise<City> {
    await this.assertCountryActiveAndPresent(dto.countryId);
    await this.assertRegionActivePresentAndBelongsToCountry(
      dto.regionId,
      dto.countryId,
    );
    const city = new this.cityModel({
      ...dto,
      countryId: new Types.ObjectId(dto.countryId),
      regionId: new Types.ObjectId(dto.regionId),
    });
    return city.save();
  }

  async update(id: string, dto: UpdateCityDto): Promise<City> {
    const existing = await this.cityModel.findOne({ _id: id });
    if (!existing) {
      throw new NotFoundException(this.i18n.t('common.errors.city_not_found'));
    }

    const update: Record<string, unknown> = {};
    if (dto.name) {
      if (dto.name.en !== undefined) update['name.en'] = dto.name.en;
      if (dto.name.ar !== undefined) update['name.ar'] = dto.name.ar;
    }

    // Determine effective countryId for region validation
    const effectiveCountryId = dto.countryId ?? String(existing.countryId);

    if (dto.countryId !== undefined) {
      await this.assertCountryActiveAndPresent(dto.countryId);
      update['countryId'] = new Types.ObjectId(dto.countryId);
    }
    if (dto.regionId !== undefined) {
      await this.assertRegionActivePresentAndBelongsToCountry(
        dto.regionId,
        effectiveCountryId,
      );
      update['regionId'] = new Types.ObjectId(dto.regionId);
    }
    if (dto.postalCode !== undefined) update['postalCode'] = dto.postalCode;
    if (dto.isActive !== undefined) update['isActive'] = dto.isActive;

    const city = await this.cityModel.findOneAndUpdate(
      { _id: id },
      { $set: update },
      { new: true },
    );

    if (!city) {
      throw new NotFoundException(this.i18n.t('common.errors.city_not_found'));
    }

    return city;
  }

  async softDelete(id: string): Promise<void> {
    const city = await this.cityModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );
    if (!city) {
      throw new NotFoundException(
        this.i18n.t('common.errors.city_not_found_or_deleted'),
      );
    }
  }

  async findAllAdmin(query: AdminCityQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const baseFilter: FilterQuery<CityDocument> = {};
    const andConditions: FilterQuery<CityDocument>[] = [baseFilter];
    if (query.deletedOnly) {
      andConditions.push({ deletedAt: { $ne: null } });
    } else if (!query.includeDeleted) {
      andConditions.push({ deletedAt: null });
    }
    if (query.isActive !== undefined) {
      andConditions.push({ isActive: query.isActive });
    }
    if (query.countryId) {
      const countryOid = new Types.ObjectId(query.countryId);
      andConditions.push({
        countryId: { $in: [countryOid, String(query.countryId)] },
      });
    }
    if (query.regionId) {
      const regionOid = new Types.ObjectId(query.regionId);
      andConditions.push({
        regionId: { $in: [regionOid, String(query.regionId)] },
      });
    }

    const orFilter = this.buildSearchFilter(query.search);
    const andFilter =
      andConditions.length > 1 ? { $and: andConditions } : baseFilter;
    const mongoFilter = orFilter
      ? { $and: [andFilter], $or: orFilter }
      : andFilter;

    const cities = await this.cityModel
      .find(mongoFilter)
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.cityModel.countDocuments(mongoFilter);
    return createPaginatedResponse(cities, page, limit, total);
  }

  async findOneAdmin(id: string): Promise<City> {
    // Validate ObjectId early to avoid CastError and return consistent 404
    if (!isValidObjectId(id)) {
      throw new NotFoundException(this.i18n.t('common.errors.city_not_found'));
    }
    const city = await this.cityModel.findOne({ _id: id });
    if (!city) {
      throw new NotFoundException(this.i18n.t('common.errors.city_not_found'));
    }
    return city;
  }

  async findAllPublic(query: PublicCityQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const filter: FilterQuery<CityDocument> = {
      isActive: true,
      deletedAt: null,
    };
    if (query.countryId) {
      const countryOid = new Types.ObjectId(query.countryId);
      filter.countryId = { $in: [countryOid, String(query.countryId)] };
    }
    if (query.regionId) {
      const regionOid = new Types.ObjectId(query.regionId);
      filter.regionId = { $in: [regionOid, String(query.regionId)] };
    }

    const orFilter = this.buildSearchFilter(query.search);
    const mongoFilter = orFilter ? { $and: [filter], $or: orFilter } : filter;

    const cities = await this.cityModel
      .find(mongoFilter)
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.cityModel.countDocuments(mongoFilter);
    return createPaginatedResponse(cities, page, limit, total);
  }

  async findOnePublic(id: string): Promise<City> {
    // Validate ObjectId early to avoid CastError and return consistent 404
    if (!isValidObjectId(id)) {
      throw new NotFoundException(this.i18n.t('common.errors.city_not_found'));
    }
    const city = await this.cityModel.findOne({
      _id: id,
      isActive: true,
      deletedAt: null,
    });
    if (!city) {
      throw new NotFoundException(this.i18n.t('common.errors.city_not_found'));
    }
    return city;
  }
}
