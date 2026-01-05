import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
  PAYPAL = 'PAYPAL',
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  UAH = 'UAH',
  GBP = 'GBP',
}

@Schema({ timestamps: true })
export class PaymentTransaction {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, enum: Currency, default: Currency.UAH })
  currency: Currency;

  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true, enum: TransactionStatus })
  status: TransactionStatus;

  @Prop({ required: true, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop()
  transactionReference: string;

  @Prop()
  description: string;

  @Prop({ type: Date, default: Date.now })
  transactionTime: Date;

  @Prop()
  processedBy: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  createdAt?: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt?: Date;
}

export type PaymentTransactionDocument = PaymentTransaction & Document;

export const PaymentTransactionSchema =
  SchemaFactory.createForClass(PaymentTransaction);

// Indexes for better query performance
PaymentTransactionSchema.index({ orderId: 1, transactionTime: -1 });
PaymentTransactionSchema.index({ status: 1 });
PaymentTransactionSchema.index({ type: 1 });
PaymentTransactionSchema.index({ transactionTime: -1 });
