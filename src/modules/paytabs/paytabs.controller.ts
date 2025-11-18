import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { PayTabsService } from './paytabs.service';
import { WalletService } from '../wallet/wallet.service';
import {
  // CreatePaymentDto,
  // PaymentResponseDto,
  EstimatePaymentDto,
  EstimatePaymentResponseDto,
} from './dto/paytabs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { type Request as ExpressRequest } from 'express';
import { ApiSort } from 'src/common/decorators/api-sort.decorator';
import { ApiAcceptLanguage } from 'src/common/decorators/api-accept-language.decorator';
import { SuccessMessage } from 'src/common/decorators/success-message.decorator';
import { DepositViaPayTabsDto } from '../wallet/dto/deposit-via-paytabs.dto';
import { WalletSubtype } from '../wallet/dto/create-wallet.dto';

@ApiTags('013- PayTabs')
@ApiAcceptLanguage()
@Controller('payment/paytabs')
export class PayTabsController {
  constructor(
    private readonly payTabsService: PayTabsService,
    private readonly walletService: WalletService,
  ) {}

  // @UseGuards(JwtAuthGuard)
  // @Post('create')
  // @ApiSort(2)
  // @HttpCode(HttpStatus.OK)
  // @ApiBearerAuth('user-access-token')
  // @ApiOperation({ summary: 'Create PayTabs payment' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Payment created successfully',
  //   type: PaymentResponseDto,
  // })
  // @ApiResponse({ status: 400, description: 'Bad request' })
  // @ApiResponse({ status: 404, description: 'Currency not found' })
  // @SuccessMessage('common.messages.paytabs_payment_created')
  // async createPayment(
  //   @Body() createPaymentDto: CreatePaymentDto,
  //   @Request() req: ExpressRequest & { user: { id: string } },
  // ): Promise<PaymentResponseDto> {
  //   return this.payTabsService.createPayment(createPaymentDto, req.user.id);
  // }

  @UseGuards(JwtAuthGuard)
  @Post('estimate')
  @ApiSort(3)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Estimate platform fees and taxes for PayTabs' })
  @ApiResponse({
    status: 200,
    description: 'Estimation calculated',
    type: EstimatePaymentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  @ApiResponse({ status: 400, description: 'PayTabs not enabled for currency' })
  @SuccessMessage('common.messages.paytabs_estimation_calculated')
  async estimateCharges(
    @Body() estimateDto: EstimatePaymentDto,
  ): Promise<EstimatePaymentResponseDto> {
    return this.payTabsService.estimateCharges(estimateDto);
  }

  // Direct deposit into MAIN wallet via PayTabs (moved from WalletController)
  @UseGuards(JwtAuthGuard)
  @Post('deposit')
  @ApiSort(2)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({
    summary: 'Deposit funds into MAIN wallet via PayTabs (Direct)',
  })
  @ApiBody({
    description: 'Deposit via PayTabs payload',
    type: DepositViaPayTabsDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment page created successfully',
  })
  @ApiResponse({ status: 404, description: 'Wallet or currency not found' })
  @ApiResponse({
    status: 400,
    description: 'PayTabs not enabled or payment creation failed',
  })
  @SuccessMessage('common.messages.paytabs_payment_created')
  async deposit(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Body() dto: DepositViaPayTabsDto,
  ) {
    return await this.walletService.depositViaPayTabs(
      dto,
      req.user.id,
      WalletSubtype.MAIN,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('order/:orderId/:orderType')
  @ApiSort(4)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Get payment by order' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @SuccessMessage('common.messages.paytabs_payment_details')
  async getPaymentByOrder(
    @Param('orderId') orderId: string,
    @Param('orderType') orderType: string,
  ) {
    return this.payTabsService.getPaymentByOrder(orderId, orderType);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/payments')
  @ApiSort(5)
  @ApiBearerAuth('user-access-token')
  @ApiOperation({ summary: 'Get all payments for current user' })
  @ApiResponse({ status: 200, description: 'User payments list' })
  @SuccessMessage('common.messages.paytabs_user_payments_list')
  async getUserPayments(
    @Request() req: ExpressRequest & { user: { id: string } },
  ) {
    return this.payTabsService.getPaymentsByUser(req.user.id);
  }
}
