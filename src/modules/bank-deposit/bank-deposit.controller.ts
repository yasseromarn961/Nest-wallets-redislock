import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { CreateBankDepositDto } from './dto/create-bank-deposit.dto';
import { QueryBankDepositDto } from './dto/query-bank-deposit.dto';
import { CalculateDepositFeesDto } from './dto/calculate-deposit-fees.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiPagination } from '../../common/decorators/api-pagination.decorator';
import { ApiSort } from 'src/common/decorators/api-sort.decorator';

@ApiTags('015- Bank Deposits')
@ApiAcceptLanguage()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bank-deposits')
export class BankDepositController {
  constructor(private readonly bankDepositService: BankDepositService) {}

  @UseGuards(JwtAuthGuard)
  @Post('calculate-fees')
  @ApiSort(4)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({
    summary: 'Calculate deposit fees and taxes',
    description:
      'Calculate the tax amount, fee amount, and net amount after deductions for a bank deposit. This helps users know the final amount they will receive before creating the deposit request.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fees calculated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or currency not supported by bank',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bank or currency not found',
  })
  @SuccessMessage('common.messages.fees_calculated')
  async calculateFees(@Body() dto: CalculateDepositFeesDto) {
    return this.bankDepositService.calculateDepositFees(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiSort(5)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({
    summary: 'Create bank deposit request',
    description:
      'User creates a new bank deposit request with bank ID, currency ID, and amount. Fees and taxes are automatically calculated based on bank configuration.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bank deposit request created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or currency not supported by bank',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bank or currency not found',
  })
  @SuccessMessage('common.messages.bank_deposit_created')
  async createDeposit(
    @Body() dto: CreateBankDepositDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.bankDepositService.createDeposit(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiSort(6)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({
    summary: 'Get user deposit requests',
    description:
      'Retrieve a paginated list of deposit requests for the authenticated user with optional filters.',
  })
  @ApiPagination()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deposit requests retrieved successfully',
  })
  async getUserDeposits(
    @Query() query: QueryBankDepositDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.bankDepositService.getUserDeposits(req.user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiSort(7)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({
    summary: 'Get specific deposit request',
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
  async getUserDeposit(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.bankDepositService.getUserDeposit(req.user.id, id);
  }
}
