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
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WithdrawalService } from './withdrawal.service';
import {
  ApproveWithdrawalDto,
  RejectWithdrawalDto,
  CompleteWithdrawalDto,
  CancelWithdrawalDto,
} from './dto/process-withdrawal.dto';
import { AdminQueryWithdrawalDto } from './dto/query-withdrawal.dto';
import { ApiSort } from '../../common/decorators/api-sort.decorator';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { type Request as ExpressRequest } from 'express';
import { SuccessMessage } from '../../common/decorators/success-message.decorator';
import { ApiAcceptLanguage } from '../../common/decorators/api-accept-language.decorator';

@ApiTags('016- Withdrawals (Admin)')
@ApiAcceptLanguage()
@Controller('admin/withdrawals')
export class WithdrawalAdminController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @UseGuards(AdminJwtAuthGuard)
  @Get()
  @ApiSort(1)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Get all withdrawal requests with filters' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal requests retrieved successfully',
  })
  @SuccessMessage('common.messages.withdrawals_retrieved')
  async getAllWithdrawals(@Query() query: AdminQueryWithdrawalDto) {
    return await this.withdrawalService.getAllWithdrawals(query);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Get(':withdrawalId')
  @ApiSort(2)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({ summary: 'Admin: Get withdrawal request details' })
  @ApiParam({ name: 'withdrawalId', description: 'Withdrawal ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal request not found' })
  @SuccessMessage('common.messages.withdrawal_retrieved')
  async getWithdrawalById(@Param('withdrawalId') withdrawalId: string) {
    return await this.withdrawalService.getWithdrawalById(withdrawalId);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch(':withdrawalId/approve')
  @ApiSort(3)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Admin: Approve withdrawal request (moves to PROCESSING)',
  })
  @ApiParam({ name: 'withdrawalId', description: 'Withdrawal ID' })
  @ApiBody({
    description: 'Approval payload',
    type: ApproveWithdrawalDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request approved successfully',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal request not found' })
  @ApiResponse({
    status: 400,
    description: 'Withdrawal already processed',
  })
  @SuccessMessage('common.messages.withdrawal_approved')
  async approveWithdrawal(
    @Request() req: ExpressRequest & { user: Record<string, any> },
    @Param('withdrawalId') withdrawalId: string,
    @Body() dto: ApproveWithdrawalDto,
  ) {
    const adminId = (req.user?.id ||
      req.user?._id ||
      req.user?.adminId) as string;
    return await this.withdrawalService.approveWithdrawal(
      withdrawalId,
      dto,
      adminId,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch(':withdrawalId/reject')
  @ApiSort(4)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Admin: Reject withdrawal request (returns reserved balance)',
  })
  @ApiParam({ name: 'withdrawalId', description: 'Withdrawal ID' })
  @ApiBody({
    description: 'Rejection payload with reason',
    type: RejectWithdrawalDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request rejected successfully',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal request not found' })
  @ApiResponse({
    status: 400,
    description: 'Withdrawal already processed',
  })
  @SuccessMessage('common.messages.withdrawal_rejected')
  async rejectWithdrawal(
    @Request() req: ExpressRequest & { user: Record<string, any> },
    @Param('withdrawalId') withdrawalId: string,
    @Body() dto: RejectWithdrawalDto,
  ) {
    const adminId = (req.user?.id ||
      req.user?._id ||
      req.user?.adminId) as string;
    return await this.withdrawalService.rejectWithdrawal(
      withdrawalId,
      dto,
      adminId,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch(':withdrawalId/complete')
  @ApiSort(5)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary:
      'Admin: Complete withdrawal (debit wallet, credit platform accounts)',
  })
  @ApiParam({ name: 'withdrawalId', description: 'Withdrawal ID' })
  @ApiBody({
    description: 'Completion payload with transaction reference',
    type: CompleteWithdrawalDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal completed successfully',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal request not found' })
  @ApiResponse({
    status: 400,
    description: 'Withdrawal not in processing state',
  })
  @SuccessMessage('common.messages.withdrawal_completed')
  async completeWithdrawal(
    @Request() req: ExpressRequest & { user: Record<string, any> },
    @Param('withdrawalId') withdrawalId: string,
    @Body() dto: CompleteWithdrawalDto,
  ) {
    const adminId = (req.user?.id ||
      req.user?._id ||
      req.user?.adminId) as string;
    return await this.withdrawalService.completeWithdrawal(
      withdrawalId,
      dto,
      adminId,
    );
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch(':withdrawalId/cancel')
  @ApiSort(6)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('admin-access-token')
  @ApiOperation({
    summary: 'Admin: Cancel withdrawal (returns reserved balance)',
  })
  @ApiParam({ name: 'withdrawalId', description: 'Withdrawal ID' })
  @ApiBody({
    description: 'Cancellation payload with reason',
    type: CancelWithdrawalDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal cancelled successfully',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal request not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel withdrawal in this state',
  })
  @SuccessMessage('common.messages.withdrawal_cancelled')
  async cancelWithdrawal(
    @Request() req: ExpressRequest & { user: Record<string, any> },
    @Param('withdrawalId') withdrawalId: string,
    @Body() dto: CancelWithdrawalDto,
  ) {
    const adminId = (req.user?.id ||
      req.user?._id ||
      req.user?.adminId) as string;
    return await this.withdrawalService.cancelWithdrawal(
      withdrawalId,
      dto,
      adminId,
    );
  }
}
