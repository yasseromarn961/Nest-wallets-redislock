import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Request,
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
// import { CreateWalletDto } from './dto/create-wallet.dto';
import { CreateMyWalletDto } from './dto/create-my-wallet.dto';
import { GetTransactionHistoryDto } from './dto/get-transaction-history.dto';
import { GetTransactionsReportDto } from './dto/get-transactions-report.dto';
import { ApiSort } from '../../common/decorators/api-sort.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { type Request as ExpressRequest } from 'express';
import { WalletSubtype } from './dto/create-wallet.dto';
import { Account, AccountDocument } from './schemas/account.schema';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';

@ApiTags('014- Wallets')
@ApiAcceptLanguage()
@Controller('wallets')
export class WalletController {
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

  @UseGuards(JwtAuthGuard)
  @Get(':accountId/balances/:assetSymbol')
  @ApiSort(7)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Get wallet balance by account and asset symbol' })
  @ApiParam({ name: 'accountId', description: 'Wallet Account ID' })
  @ApiParam({ name: 'assetSymbol', description: 'Asset symbol (e.g., USD)' })
  @ApiResponse({ status: 200, description: 'Balance retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  getBalance(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('accountId') accountId: string,
    @Param('assetSymbol') assetSymbol: string,
  ) {
    return this.walletService.getBalanceForUser(
      accountId,
      req.user.id,
      assetSymbol,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiSort(4)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Create user wallet (MAIN or TRADING)' })
  @ApiBody({ description: 'Wallet creation payload', type: CreateMyWalletDto })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 409, description: 'Wallet already exists' })
  async createWallet(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Body() dto: CreateMyWalletDto,
  ) {
    return this.walletService.createWallet({
      userId: req.user.id,
      subtype: dto.subtype,
      name: dto.name,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiSort(6)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'User: List my wallets (optional subtype filter)' })
  @ApiQuery({ name: 'subtype', required: false, enum: WalletSubtype })
  @ApiResponse({ status: 200, description: 'Wallets retrieved successfully' })
  async listMyWallets(
    @Request() req: ExpressRequest & { user: { id: string } },
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
    const wallets: (Account | AccountDocument)[] =
      await this.walletService.listUserWallets(req.user.id, subtype);
    return wallets.map((w) => this.mapAccount(w));
  }

  @UseGuards(JwtAuthGuard)
  @Get(':accountId/transactions')
  @ApiSort(8)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Get transaction history for a specific wallet' })
  @ApiParam({ name: 'accountId', description: 'Wallet Account ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @SuccessMessage('common.messages.transactions_retrieved')
  async getTransactionHistory(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('accountId') accountId: string,
    @Query() query: GetTransactionHistoryDto,
  ) {
    return await this.walletService.getTransactionHistory(
      accountId,
      req.user.id,
      query.assetSymbol,
      query.limit || 50,
      query.offset || 0,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/transactions/report')
  @ApiSort(9)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({
    summary: 'Get comprehensive transaction report for all user wallets',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction report retrieved successfully',
  })
  @SuccessMessage('common.messages.transaction_report_retrieved')
  async getTransactionsReport(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Query() query: GetTransactionsReportDto,
  ) {
    return await this.walletService.getAllTransactionsReport(
      req.user.id,
      query.assetSymbol,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
      query.limit || 100,
      query.offset || 0,
    );
  }
}
