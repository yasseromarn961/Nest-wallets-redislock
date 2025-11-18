import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BankDepositService } from './bank-deposit.service';
import { ProcessBankDepositDto } from './dto/process-bank-deposit.dto';
import { AdminQueryBankDepositDto } from './dto/query-bank-deposit.dto';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiPagination } from '../../common/decorators/api-pagination.decorator';
import { ApiSort } from 'src/common/decorators/api-sort.decorator';

@ApiTags('015- Bank Deposits (Admin)')
@ApiAcceptLanguage()
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@Controller('admin/bank-deposits')
export class BankDepositAdminController {
  constructor(private readonly bankDepositService: BankDepositService) {}

  @UseGuards(AdminJwtAuthGuard)
  @Get()
  @ApiSort(2)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Get all deposit requests (Admin)',
    description:
      'Retrieve a paginated list of all bank deposit requests from all users with optional filters.',
  })
  @ApiPagination()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deposit requests retrieved successfully',
  })
  async getAllDeposits(@Query() query: AdminQueryBankDepositDto) {
    return this.bankDepositService.getAllDeposits(query);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get(':id')
  @ApiSort(3)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Get specific deposit request (Admin)',
    description: 'Retrieve details of a specific deposit request by ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deposit request retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deposit request not found',
  })
  async getDepositById(@Param('id') id: string) {
    return this.bankDepositService.getDepositById(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch(':id/process')
  @ApiSort(1)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Process deposit request (Approve/Reject)',
    description:
      'Admin approves or rejects a pending bank deposit request. If approved, the wallet is credited automatically. If rejected, a reason must be provided.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deposit request processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid request (already processed, rejection reason missing, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Deposit request not found',
  })
  @SuccessMessage('common.messages.bank_deposit_processed')
  async processDeposit(
    @Param('id') id: string,
    @Body() dto: ProcessBankDepositDto,
    @Request() req: { user: { _id?: string; id?: string } },
  ) {
    const adminId = req.user._id || req.user.id || '';
    return this.bankDepositService.processDeposit(id, dto, adminId);
  }
}
