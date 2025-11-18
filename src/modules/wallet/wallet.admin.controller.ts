import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { DepositDto } from './dto/deposit.dto';
import { ApiSort } from '../../common/decorators/api-sort.decorator';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { WalletSubtype } from './dto/create-wallet.dto';
import { Account, AccountDocument } from './schemas/account.schema';

@ApiTags('014- Wallets (Admin)')
@Controller('wallets/admin')
export class WalletAdminController {
  constructor(private readonly walletService: WalletService) {}

  private hasToJSON(doc: Account | AccountDocument): doc is AccountDocument {
    const candidate = doc as unknown as { toJSON?: () => unknown };
    return typeof candidate.toJSON === 'function';
  }

  private mapAccount(account: Account | AccountDocument): {
    id?: string;
    type: string;
    userId: string | null;
    subtype: string;
    status: string;
    name: string | null;
    deletedAt: Date | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  } {
    const base = {
      type: account.type,
      userId:
        account.userId == null
          ? null
          : typeof account.userId === 'string'
            ? account.userId
            : String(account.userId),
      subtype: account.subtype,
      status: account.status,
      name: account.name ?? null,
      deletedAt: account.deletedAt ?? null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    } as const;
    if (this.hasToJSON(account)) {
      const plain = account.toJSON() as { id?: string };
      return { id: plain.id, ...base };
    }
    return { ...base };
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('wallets')
  @ApiBearerAuth('admin-access-token')
  @ApiSort(1)
  @ApiOperation({ summary: 'Admin: Create user wallet' })
  @ApiBody({ description: 'Wallet creation payload', type: CreateWalletDto })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 409, description: 'Wallet already exists' })
  createWallet(@Body() dto: CreateWalletDto) {
    return this.walletService.createWallet(dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('balances/:accountId/:assetSymbol')
  @ApiBearerAuth('admin-access-token')
  @ApiSort(3)
  @ApiOperation({ summary: 'Admin: Get wallet balance by account and asset' })
  @ApiParam({ name: 'accountId', description: 'Wallet Account ID' })
  @ApiParam({ name: 'assetSymbol', description: 'Asset symbol (e.g., USD)' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  getBalance(
    @Param('accountId') accountId: string,
    @Param('assetSymbol') assetSymbol: string,
  ) {
    return this.walletService.getBalance(accountId, assetSymbol);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('deposit')
  @ApiBearerAuth('admin-access-token')
  @ApiSort(2)
  @ApiOperation({
    summary: 'Admin: Deposit funds into wallet with idempotency',
  })
  @ApiBody({ description: 'Deposit payload', type: DepositDto })
  @ApiResponse({ status: 200, description: 'Deposit processed successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @ApiResponse({
    status: 409,
    description: 'Deposit failed (conflict or lock)',
  })
  deposit(@Body() dto: DepositDto) {
    return this.walletService.deposit(dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get('by-user/:userId')
  @ApiBearerAuth('admin-access-token')
  @ApiSort(4)
  @ApiOperation({
    summary: 'Admin: List wallets by user ID (optional subtype)',
  })
  @ApiParam({ name: 'userId', description: 'User ID to fetch wallets for' })
  @ApiQuery({ name: 'subtype', required: false, enum: WalletSubtype })
  @ApiResponse({ status: 200, description: 'Wallets retrieved successfully' })
  async listWalletsByUser(
    @Param('userId') userId: string,
    @Query('subtype') subtype?: WalletSubtype,
  ): Promise<
    {
      id?: string;
      type: string;
      userId: string | null;
      subtype: string;
      status: string;
      name: string | null;
      deletedAt: Date | null;
      createdAt: Date | string;
      updatedAt: Date | string;
    }[]
  > {
    const items: (Account | AccountDocument)[] =
      await this.walletService.listWalletsByUserAdmin(userId, subtype);
    return items.map((w) => this.mapAccount(w));
  }
}
