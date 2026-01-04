import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  Currency,
} from '../../schemas/payment-transaction.schema';

export class PaymentTransactionResponseDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'Order ID',
    example: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
  })
  orderId: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 150.5,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    enum: Currency,
  })
  currency: Currency;

  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
  })
  type: TransactionType;

  @ApiProperty({
    description: 'Transaction status',
    enum: TransactionStatus,
  })
  status: TransactionStatus;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
  })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Transaction reference',
  })
  transactionReference?: string;

  @ApiPropertyOptional({
    description: 'Description',
  })
  description?: string;

  @ApiProperty({
    description: 'Transaction time',
    example: '2024-12-07T10:30:00Z',
  })
  transactionTime: Date;

  @ApiPropertyOptional({
    description: 'Processed by',
  })
  processedBy?: string;

  @ApiPropertyOptional({
    description: 'Metadata',
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Created at',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at',
  })
  updatedAt: Date;
}

export class TransactionCountsResponseDto {
  @ApiProperty({
    description:
      'Object with order IDs as keys and transaction counts as values',
    example: {
      'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc': 5,
      'a1b2c3d4-1111-4444-8888-123456789002': 2,
      'a1b2c3d4-1111-4444-8888-123456789003': 0,
    },
  })
  counts: Record<string, number>;
}
