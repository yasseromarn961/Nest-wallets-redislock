import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types, isValidObjectId } from 'mongoose';
import { Address, AddressDocument } from './schemas/address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import {
  UpdateAddressDto,
  AdminAddressQueryDto,
} from './dto/update-address.dto';
import { I18nService } from 'nestjs-i18n';
import { Country, CountryDocument } from '../country/schemas/country.schema';
import { Region, RegionDocument } from '../region/schemas/region.schema';
import { City, CityDocument } from '../city/schemas/city.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { createPaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    @InjectModel(Country.name) private countryModel: Model<CountryDocument>,
    @InjectModel(Region.name) private regionModel: Model<RegionDocument>,
    @InjectModel(City.name) private cityModel: Model<CityDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly i18n: I18nService,
  ) {}

  private async assertUserExists(userId: string): Promise<void> {
    const user = await this.userModel.findOne({
      _id: userId,
      deletedAt: null,
    });
    if (!user) {
      throw new NotFoundException(this.i18n.t('common.errors.user_not_found'));
    }
  }

  private async assertCityActiveAndGetLocationIds(
    cityId: string,
  ): Promise<{ countryId: Types.ObjectId; regionId: Types.ObjectId }> {
    const city = await this.cityModel.findOne({
      _id: cityId,
      isActive: true,
      deletedAt: null,
    });
    if (!city) {
      throw new NotFoundException(this.i18n.t('common.errors.city_not_found'));
    }
    return {
      countryId: city.countryId,
      regionId: city.regionId,
    };
  }

  async create(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<{ address: Address; message: string }> {
    // Check if user exists
    await this.assertUserExists(userId);

    // Check if user already has an address
    const existingAddress = await this.addressModel.findOne({
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });
    if (existingAddress) {
      throw new ConflictException(
        this.i18n.t('common.errors.address_already_exists'),
      );
    }

    // Get country and region from city
    const { countryId, regionId } =
      await this.assertCityActiveAndGetLocationIds(dto.cityId);

    const address = new this.addressModel({
      userId: new Types.ObjectId(userId),
      countryId: countryId,
      regionId: regionId,
      cityId: new Types.ObjectId(dto.cityId),
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      postalCode: dto.postalCode,
    });

    const savedAddress = await address.save();

    // Populate before returning (does not save to DB, only for response)
    const populatedAddress = await this.addressModel
      .findById(savedAddress._id)
      .populate('countryId')
      .populate('regionId')
      .populate('cityId')
      .exec();

    if (!populatedAddress) {
      throw new NotFoundException(
        this.i18n.t('common.errors.address_not_found'),
      );
    }

    return {
      address: populatedAddress,
      message: this.i18n.t('common.messages.address_created_success'),
    };
  }

  async update(
    userId: string,
    dto: UpdateAddressDto,
  ): Promise<{ address: Address; message: string }> {
    const existing = await this.addressModel.findOne({
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    });

    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('common.errors.address_not_found'),
      );
    }

    const update: Record<string, unknown> = {};

    // If city is being updated, get country and region from the new city
    if (dto.cityId !== undefined) {
      const { countryId, regionId } =
        await this.assertCityActiveAndGetLocationIds(dto.cityId);
      update['cityId'] = new Types.ObjectId(dto.cityId);
      update['countryId'] = countryId;
      update['regionId'] = regionId;
    }

    // Set other fields
    if (dto.addressLine1 !== undefined)
      update['addressLine1'] = dto.addressLine1;
    if (dto.addressLine2 !== undefined)
      update['addressLine2'] = dto.addressLine2;
    if (dto.postalCode !== undefined) update['postalCode'] = dto.postalCode;

    const address = await this.addressModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), deletedAt: null },
      { $set: update },
      { new: true },
    );

    if (!address) {
      throw new NotFoundException(
        this.i18n.t('common.errors.address_not_found'),
      );
    }

    // Populate before returning (does not save to DB, only for response)
    const populatedAddress = await this.addressModel
      .findById(address._id)
      .populate('countryId')
      .populate('regionId')
      .populate('cityId')
      .exec();

    if (!populatedAddress) {
      throw new NotFoundException(
        this.i18n.t('common.errors.address_not_found'),
      );
    }

    return {
      address: populatedAddress,
      message: this.i18n.t('common.messages.address_updated_success'),
    };
  }

  async findOne(userId: string): Promise<Address | null> {
    const address = await this.addressModel
      .findOne({
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      })
      .populate('countryId')
      .populate('regionId')
      .populate('cityId')
      .exec();

    return address;
  }

  async findOneAdmin(addressId: string): Promise<Address> {
    if (!isValidObjectId(addressId)) {
      throw new NotFoundException(
        this.i18n.t('common.errors.address_not_found'),
      );
    }

    const address = await this.addressModel
      .findOne({ _id: addressId })
      .populate('userId')
      .populate('countryId')
      .populate('regionId')
      .populate('cityId')
      .exec();

    if (!address) {
      throw new NotFoundException(
        this.i18n.t('common.errors.address_not_found'),
      );
    }

    return address;
  }

  async findAllAdmin(query: AdminAddressQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const baseFilter: FilterQuery<AddressDocument> = {};
    const andConditions: FilterQuery<AddressDocument>[] = [baseFilter];

    if (query.deletedOnly) {
      andConditions.push({ deletedAt: { $ne: null } });
    } else if (!query.includeDeleted) {
      andConditions.push({ deletedAt: null });
    }

    if (query.userId) {
      const userOid = new Types.ObjectId(query.userId);
      andConditions.push({
        userId: { $in: [userOid, String(query.userId)] },
      });
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

    if (query.cityId) {
      const cityOid = new Types.ObjectId(query.cityId);
      andConditions.push({
        cityId: { $in: [cityOid, String(query.cityId)] },
      });
    }

    const mongoFilter =
      andConditions.length > 1 ? { $and: andConditions } : baseFilter;

    const addresses = await this.addressModel
      .find(mongoFilter)
      .populate('userId')
      .populate('countryId')
      .populate('regionId')
      .populate('cityId')
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.addressModel.countDocuments(mongoFilter);
    return createPaginatedResponse(addresses, page, limit, total);
  }

  async softDelete(userId: string): Promise<{ message: string }> {
    const address = await this.addressModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );

    if (!address) {
      throw new NotFoundException(
        this.i18n.t('common.errors.address_not_found'),
      );
    }

    return { message: this.i18n.t('common.messages.address_deleted_success') };
  }
}
