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
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { QueryWithdrawalDto } from './dto/query-withdrawal.dto';
import { CalculateWithdrawalFeesDto } from './dto/calculate-withdrawal-fees.dto';
import { ApiSort } from '../../common/decorators/api-sort.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { type Request as ExpressRequest } from 'express';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';

@ApiTags('016- Withdrawals')
@ApiAcceptLanguage()
@Controller('withdrawals')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @UseGuards(JwtAuthGuard)
  @Post('request')
  @ApiSort(1)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({
    summary: 'Create withdrawal request from MAIN wallet',
  })
  @ApiBody({
    description: 'Withdrawal request payload',
    type: CreateWithdrawalRequestDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal request created successfully',
  })
  @ApiResponse({ status: 404, description: 'Bank or currency not found' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or validation error',
  })
  @SuccessMessage('common.messages.withdrawal_request_created')
  async createWithdrawalRequest(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Body() dto: CreateWithdrawalRequestDto,
  ) {
    return await this.withdrawalService.createWithdrawalRequest(
      dto,
      req.user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiSort(2)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Get my withdrawal requests' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal requests retrieved successfully',
  })
  @SuccessMessage('common.messages.withdrawals_retrieved')
  async getMyWithdrawals(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Query() query: QueryWithdrawalDto,
  ) {
    return await this.withdrawalService.getUserWithdrawals(req.user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my/:withdrawalId')
  @ApiSort(3)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Get specific withdrawal request details' })
  @ApiParam({ name: 'withdrawalId', description: 'Withdrawal ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal request not found' })
  @SuccessMessage('common.messages.withdrawal_retrieved')
  async getMyWithdrawal(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('withdrawalId') withdrawalId: string,
  ) {
    return await this.withdrawalService.getUserWithdrawal(
      req.user.id,
      withdrawalId,
    );
  }

  @Post('calculate-fees')
  @ApiSort(4)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate withdrawal fees before requesting' })
  @ApiBody({
    description: 'Withdrawal calculation payload',
    type: CalculateWithdrawalFeesDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Fees calculated successfully',
  })
  @ApiResponse({ status: 404, description: 'Bank or currency not found' })
  @SuccessMessage('common.messages.withdrawal_fees_calculated')
  async calculateFees(@Body() dto: CalculateWithdrawalFeesDto) {
    return await this.withdrawalService.calculateWithdrawalFees(dto);
  }
}
