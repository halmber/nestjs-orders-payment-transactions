import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaymentTransaction,
  PaymentTransactionDocument,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  Currency,
} from '../transactions/schemas/payment-transaction.schema';

@Injectable()
export class SeedDataService {
  private readonly logger = new Logger(SeedDataService.name);

  constructor(
    @InjectModel(PaymentTransaction.name)
    private transactionModel: Model<PaymentTransactionDocument>,
  ) {}

  async seedTransactions(): Promise<void> {
    try {
      // Check if data already exists
      const existingCount = await this.transactionModel.countDocuments().exec();

      if (existingCount > 0) {
        this.logger.log(
          `Database already contains ${existingCount} transactions. Skipping seed.`,
        );
        return;
      }

      this.logger.log('Starting database seeding...');

      const orderIds = [
        'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        'a3eccec7-7c88-4689-a803-6fa65d6296de',
        '2056dc37-c96e-4a6c-ac71-9c6d303df4af',
        'b968c1b8-ec5b-4c6e-b499-973c7462761a',
        'fccb2931-6143-4347-834e-3b9d33b78e91',
        'c60453b2-abbd-4c83-9142-879729a04e3d',
        '3952a746-ddc9-41af-9b5a-03d76208e499',
        '73d848bc-cb92-4b23-b1ef-3980bf8b9afa',
        'd7e9b794-a2b9-471a-abeb-bcee573257a9',
        '3cba3b5c-5217-45fd-99c3-48ed680730b9',
        'f9354319-8fe8-42ac-bf93-76478b8f1ac7',
        'efce83f6-adcc-4940-ac7e-1e55626fa0dc',
        'df072dd9-4142-4a62-8ba5-d33908dfaa9e',
        '63b52f8a-d186-4fed-a8f7-d3d3df7edebf',
        '28c4f154-8640-486c-b31c-3e7af78d4085',
      ];

      const currencies = [
        Currency.UAH,
        Currency.USD,
        Currency.EUR,
        Currency.GBP,
      ];
      const paymentMethods = [
        PaymentMethod.CARD,
        PaymentMethod.CASH,
        PaymentMethod.PAYPAL,
      ];
      const statuses = [
        TransactionStatus.COMPLETED,
        TransactionStatus.PENDING,
        TransactionStatus.FAILED,
      ];
      const seedData: any[] = [];

      // Generate 3-5 transactions per order
      for (const orderId of orderIds) {
        const transactionCount = 3 + Math.floor(Math.random() * 3); // 3-5 transactions

        for (let i = 0; i < transactionCount; i++) {
          const transactionType =
            i === 0
              ? TransactionType.PAYMENT
              : Math.random() > 0.8
                ? TransactionType.REFUND
                : TransactionType.PAYMENT;

          const baseAmount = 50 + Math.random() * 450; // 50-500
          const amount = parseFloat(baseAmount.toFixed(2));

          const daysAgo = Math.floor(Math.random() * 90); // Last 90 days
          const hoursAgo = Math.floor(Math.random() * 24);
          const transactionTime = new Date();
          transactionTime.setDate(transactionTime.getDate() - daysAgo);
          transactionTime.setHours(transactionTime.getHours() - hoursAgo);

          const transaction: PaymentTransaction = {
            orderId,
            amount,
            currency: currencies[Math.floor(Math.random() * currencies.length)],
            type: transactionType,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            paymentMethod:
              paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
            transactionTime,
            transactionReference: `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
            description: this.generateDescription(transactionType),
            processedBy: this.generateProcessedBy(),
            metadata: this.generateMetadata(transactionType),
          };

          seedData.push(transaction);
        }
      }

      // Insert all transactions
      await this.transactionModel.insertMany(seedData);

      this.logger.log(
        `✅ Successfully seeded ${seedData.length} transactions for ${orderIds.length} orders`,
      );

      // Log summary
      const summary = {
        totalTransactions: seedData.length,
        totalOrders: orderIds.length,
        avgTransactionsPerOrder: (seedData.length / orderIds.length).toFixed(2),
        payments: seedData.filter((t) => t.type === TransactionType.PAYMENT)
          .length,
        refunds: seedData.filter((t) => t.type === TransactionType.REFUND)
          .length,
        completed: seedData.filter(
          (t) => t.status === TransactionStatus.COMPLETED,
        ).length,
        pending: seedData.filter((t) => t.status === TransactionStatus.PENDING)
          .length,
        failed: seedData.filter((t) => t.status === TransactionStatus.FAILED)
          .length,
      };

      this.logger.log('Seed Summary:', JSON.stringify(summary, null, 2));
    } catch (error) {
      this.logger.error('Error seeding database:', error);
      throw error;
    }
  }

  private generateDescription(type: TransactionType): string {
    if (type === TransactionType.PAYMENT) {
      const descriptions = [
        'Payment for order',
        'Full payment received',
        'Partial payment',
        'Initial payment',
        'Online payment',
        'Card payment processed',
        'PayPal payment received',
        'Cash payment',
      ];
      return descriptions[Math.floor(Math.random() * descriptions.length)];
    } else {
      const descriptions = [
        'Full refund issued',
        'Partial refund',
        'Customer requested refund',
        'Refund for returned items',
        'Refund - quality issues',
        'Refund - order cancelled',
        'Refund - duplicate charge',
      ];
      return descriptions[Math.floor(Math.random() * descriptions.length)];
    }
  }

  private generateProcessedBy(): string {
    const processors = [
      'system-auto',
      'admin@store.com',
      'payment-gateway',
      'cashier-001',
      'cashier-002',
      'manager@store.com',
      'support@store.com',
    ];
    return processors[Math.floor(Math.random() * processors.length)];
  }

  private generateMetadata(type: TransactionType): Record<string, any> {
    const baseMetadata: Record<string, any> = {
      ipAddress: this.generateRandomIP(),
      userAgent: 'Mozilla/5.0 (compatible; Store/1.0)',
    };

    if (type === TransactionType.PAYMENT) {
      baseMetadata.gateway = ['stripe', 'paypal', 'square'][
        Math.floor(Math.random() * 3)
      ];
      baseMetadata.cardLast4 = Math.floor(
        1000 + Math.random() * 9000,
      ).toString();
      baseMetadata.cardBrand = ['visa', 'mastercard', 'amex'][
        Math.floor(Math.random() * 3)
      ];
    } else {
      baseMetadata.refundReason = [
        'customer_request',
        'quality_issue',
        'cancelled',
      ][Math.floor(Math.random() * 3)];
      baseMetadata.originalTransactionRef = `TXN-ORIG-${Math.random().toString(36).substring(7).toUpperCase()}`;
    }

    return baseMetadata;
  }

  private generateRandomIP(): string {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
  }

  async clearTransactions(): Promise<void> {
    const result = await this.transactionModel.deleteMany({}).exec();
    this.logger.log(
      `🗑️  Cleared ${result.deletedCount} transactions from database`,
    );
  }
}
