import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types, isValidObjectId } from 'mongoose';
import { Bank, BankDocument } from './schemas/bank.schema';
import { CreateBankDto } from './dto/create-bank.dto';
import {
  UpdateBankDto,
  AdminBankQueryDto,
  PublicBankQueryDto,
} from './dto/update-bank.dto';
import { UpdateFeeDto, FeeOperationType } from './dto/update-fee.dto';
import { I18nService } from 'nestjs-i18n';
import {
  Currency,
  CurrencyDocument,
} from '../currency/schemas/currency.schema';
import { createPaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class BanksService {
  constructor(
    @InjectModel(Bank.name)
    private bankModel: Model<BankDocument>,
    @InjectModel(Currency.name)
    private currencyModel: Model<CurrencyDocument>,
    private readonly i18n: I18nService,
  ) {}

  private async validateCurrencies(
    currencies?: Array<{
      currencyId: string;
      depositEnabled?: boolean;
      withdrawEnabled?: boolean;
    }>,
  ): Promise<void> {
    if (!currencies || currencies.length === 0) return;

    const currencyIds = currencies.map((c) => c.currencyId);
    const uniqueIds = [...new Set(currencyIds)];

    if (uniqueIds.length !== currencyIds.length) {
      throw new BadRequestException(
        this.i18n.t('common.errors.duplicate_currency_in_bank'),
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
  ): FilterQuery<BankDocument>[] | undefined {
    if (!search) return undefined;
    const regex = new RegExp(search, 'i');
    return [{ 'name.en': regex }, { 'name.ar': regex }, { code: regex }];
  }

  async create(dto: CreateBankDto): Promise<Bank> {
    // Check if code already exists
    const existing = await this.bankModel.findOne({
      code: dto.code,
      deletedAt: null,
    });
    if (existing) {
      throw new ConflictException(
        this.i18n.t('common.errors.bank_code_exists'),
      );
    }

    await this.validateCurrencies(dto.currencies);

    const currencies = (dto.currencies || []).map((c) => ({
      currencyId: new Types.ObjectId(c.currencyId),
      depositEnabled: c.depositEnabled ?? true,
      withdrawEnabled: c.withdrawEnabled ?? true,
      depositFee: c.depositFee,
      withdrawFee: c.withdrawFee,
      depositTax: c.depositTax,
      withdrawTax: c.withdrawTax,
    }));

    const bank = new this.bankModel({
      name: dto.name,
      code: dto.code,
      description: dto.description,
      depositAvailable: dto.depositAvailable ?? true,
      withdrawAvailable: dto.withdrawAvailable ?? true,
      currencies,
      isActive: dto.isActive ?? true,
    });
    await bank.save();
    const populated = await this.bankModel
      .findOne({ _id: bank._id })
      .populate('currencies.currencyId');
    return populated ?? bank;
  }

  async update(id: string, dto: UpdateBankDto): Promise<Bank> {
    const existing = await this.bankModel.findOne({ _id: id });
    if (!existing) {
      throw new NotFoundException(this.i18n.t('common.errors.bank_not_found'));
    }

    // Check for code conflict if updating code
    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.bankModel.findOne({
        code: dto.code,
        deletedAt: null,
        _id: { $ne: id },
      });
      if (codeExists) {
        throw new ConflictException(
          this.i18n.t('common.errors.bank_code_exists'),
        );
      }
    }

    if (dto.currencies) {
      // Validate that all required fields are present
      const validCurrencies = dto.currencies.filter((c) => c.currencyId);
      if (validCurrencies.length !== dto.currencies.length) {
        throw new BadRequestException(
          this.i18n.t('common.errors.invalid_currency_data'),
        );
      }
      await this.validateCurrencies(
        validCurrencies as Array<{
          currencyId: string;
          depositEnabled?: boolean;
          withdrawEnabled?: boolean;
        }>,
      );
    }

    const update: Record<string, unknown> = {};
    if (dto.name) {
      if (dto.name.en !== undefined) update['name.en'] = dto.name.en;
      if (dto.name.ar !== undefined) update['name.ar'] = dto.name.ar;
    }
    if (dto.code !== undefined) update['code'] = dto.code;
    if (dto.description) {
      if (dto.description.en !== undefined)
        update['description.en'] = dto.description.en;
      if (dto.description.ar !== undefined)
        update['description.ar'] = dto.description.ar;
    }
    if (dto.depositAvailable !== undefined)
      update['depositAvailable'] = dto.depositAvailable;
    if (dto.withdrawAvailable !== undefined)
      update['withdrawAvailable'] = dto.withdrawAvailable;
    if (dto.isActive !== undefined) update['isActive'] = dto.isActive;

    if (dto.currencies !== undefined) {
      update['currencies'] = dto.currencies.map((c) => ({
        currencyId: new Types.ObjectId(c.currencyId),
        depositEnabled: c.depositEnabled ?? true,
        withdrawEnabled: c.withdrawEnabled ?? true,
        depositFee: c.depositFee,
        withdrawFee: c.withdrawFee,
        depositTax: c.depositTax,
        withdrawTax: c.withdrawTax,
      }));
    }

    const bank = await this.bankModel.findOneAndUpdate(
      { _id: id },
      { $set: update },
      { new: true },
    );

    if (!bank) {
      throw new NotFoundException(this.i18n.t('common.errors.bank_not_found'));
    }

    const populated = await this.bankModel
      .findOne({ _id: bank._id })
      .populate('currencies.currencyId');
    return populated ?? bank;
  }

  async toggleActivation(id: string, isActive: boolean): Promise<Bank> {
    const bank = await this.bankModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { isActive } },
      { new: true },
    );
    if (!bank) {
      throw new NotFoundException(
        this.i18n.t('common.errors.bank_not_found_or_deleted'),
      );
    }
    return bank;
  }

  async toggleCurrencyDeposit(
    bankId: string,
    currencyId: string,
    depositEnabled: boolean,
  ): Promise<Bank> {
    if (!isValidObjectId(bankId) || !isValidObjectId(currencyId)) {
      throw new BadRequestException(this.i18n.t('common.errors.invalid_id'));
    }

    const bank = await this.bankModel.findOne({
      _id: bankId,
      deletedAt: null,
    });

    if (!bank) {
      throw new NotFoundException(
        this.i18n.t('common.errors.bank_not_found_or_deleted'),
      );
    }

    const currencyIndex = bank.currencies.findIndex(
      (c) => String(c.currencyId) === String(currencyId),
    );

    if (currencyIndex === -1) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_in_bank'),
      );
    }

    bank.currencies[currencyIndex].depositEnabled = depositEnabled;
    await bank.save();
    const populated = await this.bankModel
      .findOne({ _id: bankId })
      .populate('currencies.currencyId');
    return populated ?? bank;
  }

  async toggleCurrencyWithdraw(
    bankId: string,
    currencyId: string,
    withdrawEnabled: boolean,
  ): Promise<Bank> {
    if (!isValidObjectId(bankId) || !isValidObjectId(currencyId)) {
      throw new BadRequestException(this.i18n.t('common.errors.invalid_id'));
    }

    const bank = await this.bankModel.findOne({
      _id: bankId,
      deletedAt: null,
    });

    if (!bank) {
      throw new NotFoundException(
        this.i18n.t('common.errors.bank_not_found_or_deleted'),
      );
    }

    const currencyIndex = bank.currencies.findIndex(
      (c) => String(c.currencyId) === String(currencyId),
    );

    if (currencyIndex === -1) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_in_bank'),
      );
    }

    bank.currencies[currencyIndex].withdrawEnabled = withdrawEnabled;
    await bank.save();
    const populated = await this.bankModel
      .findOne({ _id: bankId })
      .populate('currencies.currencyId');
    return populated ?? bank;
  }

  async toggleCurrencyOperation(
    bankId: string,
    currencyId: string,
    type: 'deposit' | 'withdraw' | 'both',
    enabled: boolean,
  ): Promise<Bank> {
    if (type !== 'deposit' && type !== 'withdraw' && type !== 'both') {
      throw new BadRequestException(
        this.i18n.t('common.errors.invalid_operation_type'),
      );
    }
    if (type === 'deposit') {
      return this.toggleCurrencyDeposit(bankId, currencyId, enabled);
    }
    if (type === 'withdraw') {
      return this.toggleCurrencyWithdraw(bankId, currencyId, enabled);
    }
    await this.toggleCurrencyDeposit(bankId, currencyId, enabled);
    return this.toggleCurrencyWithdraw(bankId, currencyId, enabled);
  }

  async softDelete(id: string): Promise<void> {
    const bank = await this.bankModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    );
    if (!bank) {
      throw new NotFoundException(
        this.i18n.t('common.errors.bank_not_found_or_deleted'),
      );
    }
  }

  async findAllAdmin(query: AdminBankQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const baseFilter: FilterQuery<BankDocument> = {};
    const andConditions: FilterQuery<BankDocument>[] = [baseFilter];

    if (query.deletedOnly) {
      andConditions.push({ deletedAt: { $ne: null } });
    } else if (!query.includeDeleted) {
      andConditions.push({ deletedAt: null });
    }

    if (query.isActive !== undefined) {
      andConditions.push({ isActive: query.isActive });
    }

    if (query.depositAvailable !== undefined) {
      andConditions.push({ depositAvailable: query.depositAvailable });
    }

    if (query.withdrawAvailable !== undefined) {
      andConditions.push({ withdrawAvailable: query.withdrawAvailable });
    }

    if (query.id) {
      if (!isValidObjectId(query.id)) {
        return createPaginatedResponse([], page, limit, 0);
      }
      andConditions.push({ _id: new Types.ObjectId(query.id) });
    }

    if (query.code) {
      const regex = new RegExp(query.code, 'i');
      andConditions.push({ code: regex });
    }

    const orFilter = this.buildSearchFilter(query.search);
    const andFilter =
      andConditions.length > 1 ? { $and: andConditions } : baseFilter;
    const mongoFilter = orFilter
      ? { $and: [andFilter], $or: orFilter }
      : andFilter;

    const banks = await this.bankModel
      .find(mongoFilter)
      .populate('currencies.currencyId')
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.bankModel.countDocuments(mongoFilter);
    return createPaginatedResponse(banks, page, limit, total);
  }

  async findOneAdmin(id: string): Promise<Bank> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(this.i18n.t('common.errors.bank_not_found'));
    }
    const bank = await this.bankModel
      .findOne({ _id: id })
      .populate('currencies.currencyId');
    if (!bank) {
      throw new NotFoundException(this.i18n.t('common.errors.bank_not_found'));
    }
    return bank;
  }

  async findAllPublic(query: PublicBankQueryDto) {
    const page = query.page ?? 0;
    const limit = query.limit ?? 10;
    const sortOrder = query.orderDirection === 'asc' ? 1 : -1;

    const filter: FilterQuery<BankDocument> = {
      isActive: true,
      deletedAt: null,
    };

    if (query.depositAvailable !== undefined) {
      filter.depositAvailable = query.depositAvailable;
    }

    if (query.withdrawAvailable !== undefined) {
      filter.withdrawAvailable = query.withdrawAvailable;
    }

    const banks = await this.bankModel
      .find(filter)
      .populate('currencies.currencyId')
      .sort({ createdAt: sortOrder })
      .skip(page * limit)
      .limit(limit)
      .exec();

    const total = await this.bankModel.countDocuments(filter);
    return createPaginatedResponse(banks, page, limit, total);
  }

  async findOnePublic(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(this.i18n.t('common.errors.bank_not_found'));
    }
    const bank = await this.bankModel
      .findOne({ _id: id, isActive: true, deletedAt: null })
      .populate('currencies.currencyId');
    if (!bank) {
      throw new NotFoundException(this.i18n.t('common.errors.bank_not_found'));
    }

    return bank;
  }

  async updateCurrencyFee(
    bankId: string,
    currencyId: string,
    operationType: FeeOperationType,
    updateFeeDto: UpdateFeeDto,
  ): Promise<Bank> {
    // Validate bankId
    if (!isValidObjectId(bankId)) {
      throw new BadRequestException(
        this.i18n.t('common.errors.invalid_bank_id'),
      );
    }

    // Validate currencyId
    if (!isValidObjectId(currencyId)) {
      throw new BadRequestException(
        this.i18n.t('common.errors.invalid_currency_id'),
      );
    }

    // Find the bank
    const bank = await this.bankModel.findOne({
      _id: bankId,
      deletedAt: null,
    });

    if (!bank) {
      throw new NotFoundException(this.i18n.t('common.errors.bank_not_found'));
    }

    // Find the currency in bank's currencies array
    const currencyIndex = bank.currencies.findIndex(
      (c) => c.currencyId.toString() === currencyId,
    );

    if (currencyIndex === -1) {
      throw new NotFoundException(
        this.i18n.t('common.errors.currency_not_in_bank'),
      );
    }

    // Get current fee structure based on operation type
    const currentFee = bank.currencies[currencyIndex][operationType];

    // Update only the fields that are provided
    if (updateFeeDto.enabled !== undefined) {
      currentFee.enabled = updateFeeDto.enabled;
    }
    if (updateFeeDto.type !== undefined) {
      currentFee.type = updateFeeDto.type;
    }
    if (updateFeeDto.percentage !== undefined) {
      currentFee.percentage = updateFeeDto.percentage;
    }
    if (updateFeeDto.fixedAmount !== undefined) {
      currentFee.fixedAmount = updateFeeDto.fixedAmount;
    }

    // Update the fee structure
    bank.currencies[currencyIndex][operationType] = currentFee;

    // Save and return
    await bank.save();

    const updatedBank = await this.bankModel
      .findById(bankId)
      .populate('currencies.currencyId')
      .exec();

    if (!updatedBank) {
      throw new NotFoundException(this.i18n.t('common.errors.bank_not_found'));
    }

    return updatedBank;
  }
}
