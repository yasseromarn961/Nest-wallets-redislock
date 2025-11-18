import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsEmail,
  ValidateNested,
  IsBoolean,
  IsMongoId,
  // IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FeeType } from 'src/common/enums/index';

export enum PayTabsTransactionType {
  SALE = 'sale',
  AUTH = 'auth',
  CAPTURE = 'capture',
  VOID = 'void',
  REFUND = 'refund',
}

export enum PayTabsPaymentMethod {
  ALL = 'all',
  CREDIT_CARD = 'creditcard',
  DEBIT_CARD = 'debitcard',
  MADA = 'mada',
  APPLE_PAY = 'applepay',
  STC_PAY = 'stcpay',
  URPAY = 'urpay',
}

export class CustomerDetailsInputDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsString()
  street1: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  zip: string;

  @ApiProperty()
  @IsString()
  ip: string;

  @ApiProperty({ enum: ['en', 'ar'], default: 'ar' })
  @IsString()
  lang: string;
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Order type',
    enum: ['product_order', 'subscription_order'],
  })
  @IsString()
  orderType: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency ID' })
  @IsMongoId()
  currencyId: string;

  @ApiProperty({ description: 'Customer details' })
  @ValidateNested()
  @Type(() => CustomerDetailsInputDto)
  customerDetails: CustomerDetailsInputDto;

  @ApiProperty({ description: 'Return URL after payment' })
  @IsString()
  returnUrl: string;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Transaction reference' })
  tran_ref: string;

  @ApiProperty({ description: 'Payment redirect URL' })
  redirect_url: string;

  @ApiProperty({ description: 'Payment page URL' })
  payment_url?: string;

  @ApiProperty({ description: 'Cart ID' })
  cart_id: string;

  @ApiProperty({ description: 'Transaction type' })
  tran_type: string;

  @ApiProperty({ description: 'Cart amount' })
  cart_amount: string;

  @ApiProperty({ description: 'Cart currency' })
  cart_currency: string;
}

export class EstimatePaymentDto {
  @ApiProperty({ description: 'Currency ID' })
  @IsMongoId()
  currencyId: string;

  @ApiProperty({ description: 'Base amount before fees and taxes' })
  @IsNumber()
  amount: number;
}

export class EstimatePaymentResponseDto {
  @ApiProperty({ description: 'Currency symbol used for estimation' })
  currency: string;

  @ApiProperty({ description: 'Base amount provided by the client' })
  baseAmount: number;

  @ApiProperty({ description: 'Calculated platform fees amount' })
  feesAmount: number;

  @ApiProperty({ description: 'Calculated tax amount' })
  taxAmount: number;

  @ApiProperty({ description: 'Final amount (base + fees + tax)' })
  finalAmount: number;

  @ApiPropertyOptional({ description: 'Fee type used' })
  feeType?: FeeType;

  @ApiPropertyOptional({ description: 'Tax type used' })
  taxType?: FeeType;
}

export class PaymentResultDto {
  @ApiPropertyOptional({ description: 'Response status' })
  @IsOptional()
  @IsString()
  response_status?: string;

  @ApiPropertyOptional({ description: 'Response code' })
  @IsOptional()
  @IsString()
  response_code?: string;

  @ApiPropertyOptional({ description: 'Response message' })
  @IsOptional()
  @IsString()
  response_message?: string;

  @ApiPropertyOptional({ description: 'Transaction time' })
  @IsOptional()
  @IsString()
  transaction_time?: string;

  @ApiPropertyOptional({ description: 'Acquirer reference' })
  @IsOptional()
  @IsString()
  acquirer_ref?: string;

  @ApiPropertyOptional({ description: 'CVV verification result' })
  @IsOptional()
  @IsString()
  cvv_result?: string;

  @ApiPropertyOptional({ description: 'AVS verification result' })
  @IsOptional()
  @IsString()
  avs_result?: string;
}

export class CustomerDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  street1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zip?: string;

  @ApiPropertyOptional({ description: 'Country code' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ip?: string;
}

export class PaymentInfoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  card_scheme?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  card_first6?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  card_last4?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  card_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  expiryMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  expiryYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_description?: string;
}

export class PayTabsWebhookDto {
  @ApiProperty({ description: 'Transaction reference' })
  @IsString()
  tran_ref: string;

  @ApiProperty({ description: 'Cart ID format: <orderType>|<orderId>' })
  @IsString()
  cart_id: string;

  @ApiPropertyOptional({ description: 'Transaction type' })
  @IsOptional()
  @IsString()
  tran_type?: string;

  @ApiPropertyOptional({ description: 'Payment result details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentResultDto)
  payment_result?: PaymentResultDto;

  @ApiPropertyOptional({ description: 'Top-level response status' })
  @IsOptional()
  @IsString()
  response_status?: string;

  @ApiPropertyOptional({ description: 'Top-level response code' })
  @IsOptional()
  @IsString()
  response_code?: string;

  @ApiPropertyOptional({ description: 'Top-level response message' })
  @IsOptional()
  @IsString()
  response_message?: string;

  @ApiPropertyOptional({ description: 'Cart amount' })
  @IsOptional()
  @IsString()
  cart_amount?: string;

  @ApiPropertyOptional({ description: 'Cart currency' })
  @IsOptional()
  @IsString()
  cart_currency?: string;

  @ApiPropertyOptional({ description: 'Cart description' })
  @IsOptional()
  @IsString()
  cart_description?: string;

  @ApiPropertyOptional({ description: 'Customer details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customer_details?: CustomerDetailsDto;

  @ApiPropertyOptional({ description: 'Payment info' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInfoDto)
  payment_info?: PaymentInfoDto;

  @ApiPropertyOptional({ description: 'Trace identifier' })
  @IsOptional()
  @IsString()
  trace?: string;

  @ApiPropertyOptional({ description: 'Service ID' })
  @IsOptional()
  @IsNumber()
  serviceId?: number;

  @ApiPropertyOptional({ description: 'Merchant ID' })
  @IsOptional()
  @IsNumber()
  merchantId?: number;

  @ApiPropertyOptional({ description: 'Profile ID' })
  @IsOptional()
  @IsNumber()
  profileId?: number;

  @ApiPropertyOptional({ description: 'Payment channel' })
  @IsOptional()
  @IsString()
  paymentChannel?: string;

  @ApiPropertyOptional({ description: 'Merchant ID from PayTabs' })
  @IsOptional()
  @IsNumber()
  merchant_id?: number;

  @ApiPropertyOptional({ description: 'Profile ID from PayTabs' })
  @IsOptional()
  @IsNumber()
  profile_id?: number;

  @ApiPropertyOptional({ description: 'Transaction currency' })
  @IsOptional()
  @IsString()
  tran_currency?: string;

  @ApiPropertyOptional({ description: 'Transaction total amount' })
  @IsOptional()
  @IsString()
  tran_total?: string;

  @ApiPropertyOptional({ description: 'Transaction class' })
  @IsOptional()
  @IsString()
  tran_class?: string;

  @ApiPropertyOptional({ description: 'Shipping details' })
  @IsOptional()
  shipping_details?: any;

  @ApiPropertyOptional({ description: '3DS details' })
  @IsOptional()
  threeDSDetails?: any;

  @ApiPropertyOptional({ description: 'IPN trace identifier' })
  @IsOptional()
  @IsString()
  ipn_trace?: string;
}

export class PayTabsFeesDto {
  @ApiProperty({ description: 'Enable fees' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'Fee type',
    enum: FeeType,
  })
  @IsEnum(FeeType)
  type: FeeType;

  @ApiProperty({ description: 'Percentage fee (0-100)' })
  @IsNumber()
  percentage: number;

  @ApiProperty({ description: 'Fixed amount fee' })
  @IsNumber()
  fixedAmount: number;
}

export class UpdateCurrencyPayTabsDto {
  @ApiProperty({ description: 'Enable/Disable PayTabs for this currency' })
  @IsBoolean()
  paytabEnabled: boolean;

  @ApiPropertyOptional({ description: 'PayTabs fee configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayTabsFeesDto)
  paytabFees?: PayTabsFeesDto;

  @ApiPropertyOptional({ description: 'PayTabs tax configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayTabsFeesDto)
  paytabTax?: PayTabsFeesDto;
}
