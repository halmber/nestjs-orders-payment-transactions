import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  IsDateString,
  IsObject,
} from 'class-validator';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  Currency,
} from '../../schemas/payment-transaction.schema';

export class CreatePaymentTransactionDto {
  @ApiProperty({
    description: 'Order ID from the main service',
    example: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
  })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 150.5,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    enum: Currency,
    example: Currency.UAH,
    default: Currency.UAH,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
    example: TransactionType.PAYMENT,
  })
  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    description: 'Transaction status',
    enum: TransactionStatus,
    example: TransactionStatus.COMPLETED,
  })
  @IsNotEmpty()
  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
  })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'External transaction reference/ID',
    example: 'TXN-2024-001234',
  })
  @IsOptional()
  @IsString()
  transactionReference?: string;

  @ApiPropertyOptional({
    description: 'Transaction description or notes',
    example: 'Payment for order #123',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Transaction time (auto-generated if not provided)',
    example: '2024-12-07T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  transactionTime?: Date;

  @ApiPropertyOptional({
    description: 'Person/system who processed the transaction',
    example: 'admin@example.com',
  })
  @IsOptional()
  @IsString()
  processedBy?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata as key-value pairs',
    example: { gateway: 'stripe', cardLast4: '4242' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
