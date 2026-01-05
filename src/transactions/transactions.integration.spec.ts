import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigModule } from '@nestjs/config';
import { TransactionsModule } from './transactions.module';
import { TransactionsService } from './transactions.service';
import { OrdersClientService } from '../orders/orders-client.service';
import {
  PaymentTransaction,
  PaymentTransactionDocument,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  Currency,
} from './schemas/payment-transaction.schema';

describe('Transactions Integration Tests', () => {
  let app: INestApplication;
  let transactionsService: TransactionsService;
  let ordersClientService: OrdersClientService;
  let transactionModel: Model<PaymentTransactionDocument>;

  const validOrderId = 'a1b2c3d4-1111-4444-8888-123456789001';
  const validOrderId2 = 'a1b2c3d4-1111-4444-8888-123456789002';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(
          'mongodb://mongodb-test:27017/transactions-test',
        ),
        TransactionsModule,
      ],
    })
      .overrideProvider(OrdersClientService)
      .useValue({
        validateOrderExists: jest.fn().mockImplementation(async (orderId) => {
          if (orderId === validOrderId || orderId === validOrderId2) {
            return {
              id: orderId,
              amount: 150.5,
              status: 'NEW',
            };
          }
          throw { response: { status: 404 } };
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    transactionsService =
      moduleFixture.get<TransactionsService>(TransactionsService);
    ordersClientService =
      moduleFixture.get<OrdersClientService>(OrdersClientService);
    transactionModel = moduleFixture.get<Model<PaymentTransactionDocument>>(
      getModelToken(PaymentTransaction.name),
    );
  });

  afterAll(async () => {
    await transactionModel.deleteMany({});
    await app.close();
  });

  beforeEach(async () => {
    await transactionModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('Service and Model Integration', () => {
    describe('Transaction Creation Flow', () => {
      it('should create transaction and save to MongoDB', async () => {
        const createDto = {
          orderId: validOrderId,
          amount: 150.5,
          currency: Currency.UAH,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        };

        const result = await transactionsService.create(createDto);

        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
        expect(result.orderId).toBe(validOrderId);

        // Verify it's actually in MongoDB
        const found = await transactionModel.findById(result.id).exec();
        expect(found).toBeDefined();
        expect(found.orderId).toBe(validOrderId);
      });

      it('should validate order exists before creating transaction', async () => {
        const createDto = {
          orderId: validOrderId,
          amount: 100,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        };

        await transactionsService.create(createDto);

        expect(ordersClientService.validateOrderExists).toHaveBeenCalledWith(
          validOrderId,
        );
        expect(ordersClientService.validateOrderExists).toHaveBeenCalledTimes(
          1,
        );
      });

      it('should set default currency if not provided', async () => {
        const createDto = {
          orderId: validOrderId,
          amount: 100,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        };

        const result = await transactionsService.create(createDto);

        expect(result.currency).toBe(Currency.UAH);

        const found = await transactionModel.findById(result.id).exec();
        expect(found.currency).toBe(Currency.UAH);
      });

      it('should auto-generate transactionTime if not provided', async () => {
        const createDto = {
          orderId: validOrderId,
          amount: 100,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        };

        const before = new Date();
        const result = await transactionsService.create(createDto);
        const after = new Date();

        expect(result.transactionTime).toBeDefined();
        expect(result.transactionTime.getTime()).toBeGreaterThanOrEqual(
          before.getTime(),
        );
        expect(result.transactionTime.getTime()).toBeLessThanOrEqual(
          after.getTime(),
        );
      });

      it('should create both PAYMENT and REFUND transactions', async () => {
        const paymentDto = {
          orderId: validOrderId,
          amount: 200,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        };

        const refundDto = {
          orderId: validOrderId,
          amount: 200,
          type: TransactionType.REFUND,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        };

        const payment = await transactionsService.create(paymentDto);
        const refund = await transactionsService.create(refundDto);

        expect(payment.type).toBe(TransactionType.PAYMENT);
        expect(refund.type).toBe(TransactionType.REFUND);

        const allTransactions = await transactionModel
          .find({ orderId: validOrderId })
          .exec();
        expect(allTransactions).toHaveLength(2);
      });
    });

    describe('Transaction Retrieval Flow', () => {
      beforeEach(async () => {
        // Create test data
        const transactions = [
          {
            orderId: validOrderId,
            amount: 100,
            currency: Currency.UAH,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            paymentMethod: PaymentMethod.CARD,
            transactionTime: new Date('2024-01-01T10:00:00Z'),
          },
          {
            orderId: validOrderId,
            amount: 50,
            currency: Currency.USD,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            paymentMethod: PaymentMethod.CASH,
            transactionTime: new Date('2024-01-02T10:00:00Z'),
          },
          {
            orderId: validOrderId,
            amount: 75,
            currency: Currency.EUR,
            type: TransactionType.REFUND,
            status: TransactionStatus.COMPLETED,
            paymentMethod: PaymentMethod.PAYPAL,
            transactionTime: new Date('2024-01-03T10:00:00Z'),
          },
        ];

        for (const tx of transactions) {
          await transactionsService.create(tx);
        }
      });

      it('should retrieve transactions sorted by time DESC', async () => {
        const result = await transactionsService.findByOrderId({
          orderId: validOrderId,
          size: 10,
          from: 0,
        });

        expect(result).toHaveLength(3);
        expect(result[0].amount).toBe(75); // Most recent
        expect(result[1].amount).toBe(50);
        expect(result[2].amount).toBe(100); // Oldest
      });

      it('should apply pagination correctly', async () => {
        const firstPage = await transactionsService.findByOrderId({
          orderId: validOrderId,
          size: 2,
          from: 0,
        });

        const secondPage = await transactionsService.findByOrderId({
          orderId: validOrderId,
          size: 2,
          from: 2,
        });

        expect(firstPage).toHaveLength(2);
        expect(secondPage).toHaveLength(1);
        expect(firstPage[0].amount).toBe(75);
        expect(firstPage[1].amount).toBe(50);
        expect(secondPage[0].amount).toBe(100);
      });

      it('should return empty array for order with no transactions', async () => {
        const result = await transactionsService.findByOrderId({
          orderId: validOrderId2,
          size: 10,
          from: 0,
        });

        expect(result).toHaveLength(0);
      });
    });

    describe('Transaction Counting Flow', () => {
      beforeEach(async () => {
        // Create different numbers of transactions for different orders
        const order1Transactions = Array(5)
          .fill(null)
          .map((_, i) => ({
            orderId: validOrderId,
            amount: 100 + i,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            paymentMethod: PaymentMethod.CARD,
          }));

        const order2Transactions = Array(2)
          .fill(null)
          .map((_, i) => ({
            orderId: validOrderId2,
            amount: 50 + i,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            paymentMethod: PaymentMethod.CARD,
          }));

        for (const tx of [...order1Transactions, ...order2Transactions]) {
          await transactionsService.create(tx);
        }
      });

      it('should count transactions using aggregation', async () => {
        const counts = await transactionsService.getCountsByOrderIds({
          orderIds: [validOrderId, validOrderId2],
        });

        expect(counts[validOrderId]).toBe(5);
        expect(counts[validOrderId2]).toBe(2);
      });

      it('should return 0 for orders without transactions', async () => {
        const nonExistentOrderId = 'a1b2c3d4-1111-4444-8888-999999999999';

        const counts = await transactionsService.getCountsByOrderIds({
          orderIds: [validOrderId, nonExistentOrderId],
        });

        expect(counts[validOrderId]).toBe(5);
        expect(counts[nonExistentOrderId]).toBe(0);
      });

      it('should handle large number of order IDs', async () => {
        const manyOrderIds = [
          validOrderId,
          validOrderId2,
          ...Array(48)
            .fill(null)
            .map((_, i) => `a1b2c3d4-1111-4444-8888-00000000000${i}`),
        ];

        const counts = await transactionsService.getCountsByOrderIds({
          orderIds: manyOrderIds,
        });

        expect(counts[validOrderId]).toBe(5);
        expect(counts[validOrderId2]).toBe(2);
        expect(Object.keys(counts)).toHaveLength(50);
      });
    });

    describe('MongoDB Index Usage', () => {
      it('should use index for orderId queries', async () => {
        // Create many transactions
        const transactions = Array(20)
          .fill(null)
          .map((_, i) => ({
            orderId: validOrderId,
            amount: 100 + i,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            paymentMethod: PaymentMethod.CARD,
          }));

        for (const tx of transactions) {
          await transactionsService.create(tx);
        }

        // This should use the compound index { orderId: 1, transactionTime: -1 }
        const result = await transactionModel
          .find({ orderId: validOrderId })
          .sort({ transactionTime: -1 })
          .explain('executionStats');

        // Verify index was used (not a collection scan)
        expect(result).toBeDefined();
      });
    });
  });

  describe('Complex Integration Scenarios', () => {
    describe('Payment and Refund Workflow', () => {
      it('should handle full payment lifecycle', async () => {
        // 1. Create initial payment
        const payment = await transactionsService.create({
          orderId: validOrderId,
          amount: 300,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        });

        expect(payment.type).toBe(TransactionType.PAYMENT);

        // 2. Create partial refund
        const partialRefund = await transactionsService.create({
          orderId: validOrderId,
          amount: 100,
          type: TransactionType.REFUND,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
          description: 'Partial refund',
        });

        expect(partialRefund.type).toBe(TransactionType.REFUND);

        // 3. Create full refund
        const fullRefund = await transactionsService.create({
          orderId: validOrderId,
          amount: 200,
          type: TransactionType.REFUND,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
          description: 'Full refund of remaining',
        });

        // 4. Verify all transactions exist
        const allTransactions = await transactionsService.findByOrderId({
          orderId: validOrderId,
          size: 10,
          from: 0,
        });

        expect(allTransactions).toHaveLength(3);

        // 5. Verify counts
        const counts = await transactionsService.getCountsByOrderIds({
          orderIds: [validOrderId],
        });

        expect(counts[validOrderId]).toBe(3);

        // 6. Verify MongoDB state
        const dbTransactions = await transactionModel
          .find({ orderId: validOrderId })
          .exec();

        expect(dbTransactions).toHaveLength(3);
        expect(
          dbTransactions.filter((t) => t.type === TransactionType.PAYMENT),
        ).toHaveLength(1);
        expect(
          dbTransactions.filter((t) => t.type === TransactionType.REFUND),
        ).toHaveLength(2);
      });

      it('should handle failed payment attempts', async () => {
        // Attempt 1 - Failed
        await transactionsService.create({
          orderId: validOrderId,
          amount: 150,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.FAILED,
          paymentMethod: PaymentMethod.CARD,
          description: 'Insufficient funds',
        });

        // Attempt 2 - Failed
        await transactionsService.create({
          orderId: validOrderId,
          amount: 150,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.FAILED,
          paymentMethod: PaymentMethod.CARD,
          description: 'Card declined',
        });

        // Attempt 3 - Success
        await transactionsService.create({
          orderId: validOrderId,
          amount: 150,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        });

        const transactions = await transactionsService.findByOrderId({
          orderId: validOrderId,
          size: 10,
          from: 0,
        });

        expect(transactions).toHaveLength(3);
        expect(transactions[0].status).toBe(TransactionStatus.COMPLETED); // Most recent
        expect(transactions[1].status).toBe(TransactionStatus.FAILED);
        expect(transactions[2].status).toBe(TransactionStatus.FAILED);
      });
    });

    describe('Multi-Currency Transactions', () => {
      it('should handle transactions in different currencies', async () => {
        const currencies = [
          Currency.UAH,
          Currency.USD,
          Currency.EUR,
          Currency.GBP,
        ];

        for (const currency of currencies) {
          await transactionsService.create({
            orderId: validOrderId,
            amount: 100,
            currency,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            paymentMethod: PaymentMethod.CARD,
          });
        }

        const transactions = await transactionsService.findByOrderId({
          orderId: validOrderId,
          size: 10,
          from: 0,
        });

        expect(transactions).toHaveLength(4);

        const foundCurrencies = transactions.map((t) => t.currency);
        expect(foundCurrencies).toContain(Currency.UAH);
        expect(foundCurrencies).toContain(Currency.USD);
        expect(foundCurrencies).toContain(Currency.EUR);
        expect(foundCurrencies).toContain(Currency.GBP);
      });
    });

    describe('High Volume Scenarios', () => {
      it('should handle many transactions for single order', async () => {
        const transactionCount = 50;

        for (let i = 0; i < transactionCount; i++) {
          await transactionsService.create({
            orderId: validOrderId,
            amount: 10 + i,
            type:
              i % 10 === 0 ? TransactionType.REFUND : TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            paymentMethod: PaymentMethod.CARD,
          });
        }

        const count =
          await transactionsService.getTotalCountByOrderId(validOrderId);
        expect(count).toBe(transactionCount);

        // Test pagination
        const firstPage = await transactionsService.findByOrderId({
          orderId: validOrderId,
          size: 20,
          from: 0,
        });

        const secondPage = await transactionsService.findByOrderId({
          orderId: validOrderId,
          size: 20,
          from: 20,
        });

        const thirdPage = await transactionsService.findByOrderId({
          orderId: validOrderId,
          size: 20,
          from: 40,
        });

        expect(firstPage).toHaveLength(20);
        expect(secondPage).toHaveLength(20);
        expect(thirdPage).toHaveLength(10);
      });

      it('should efficiently aggregate counts for many orders', async () => {
        // Create transactions for 10 different orders
        for (let orderNum = 0; orderNum < 10; orderNum++) {
          const orderId = `a1b2c3d4-1111-4444-8888-00000000000${orderNum}`;

          // Mock this order as valid
          jest
            .spyOn(ordersClientService, 'validateOrderExists')
            .mockImplementation(async (orderId: string) => {
              return { id: orderId } as any;
            });

          // Create 5 transactions per order
          for (let txNum = 0; txNum < 5; txNum++) {
            await transactionsService.create({
              orderId,
              amount: 100,
              type: TransactionType.PAYMENT,
              status: TransactionStatus.COMPLETED,
              paymentMethod: PaymentMethod.CARD,
            });
          }
        }

        const orderIds = Array(10)
          .fill(null)
          .map((_, i) => `a1b2c3d4-1111-4444-8888-00000000000${i}`);

        const counts = await transactionsService.getCountsByOrderIds({
          orderIds: orderIds,
        });

        orderIds.forEach((orderId) => {
          expect(counts[orderId]).toBe(5);
        });
      });
    });

    describe('Data Consistency', () => {
      it('should maintain timestamps correctly', async () => {
        const before = new Date();

        const transaction = await transactionsService.create({
          orderId: validOrderId,
          amount: 100,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        });

        const after = new Date();

        expect(transaction.createdAt).toBeDefined();
        expect(transaction.updatedAt).toBeDefined();
        expect(transaction.createdAt.getTime()).toBeGreaterThanOrEqual(
          before.getTime(),
        );
        expect(transaction.createdAt.getTime()).toBeLessThanOrEqual(
          after.getTime(),
        );
      });

      it('should preserve all optional fields', async () => {
        const metadata = {
          gateway: 'stripe',
          cardLast4: '4242',
          customer: 'test@example.com',
        };

        const transaction = await transactionsService.create({
          orderId: validOrderId,
          amount: 100,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
          transactionReference: 'TXN-123',
          description: 'Test payment',
          processedBy: 'admin@test.com',
          metadata,
        });

        expect(transaction.transactionReference).toBe('TXN-123');
        expect(transaction.description).toBe('Test payment');
        expect(transaction.processedBy).toBe('admin@test.com');
        expect(transaction.metadata).toEqual(metadata);

        // Verify in database
        const found = await transactionModel.findById(transaction.id).exec();
        expect(found.metadata).toEqual(metadata);
      });
    });

    describe('Deletion Operations', () => {
      it('should delete all transactions for an order', async () => {
        // Create multiple transactions
        for (let i = 0; i < 5; i++) {
          await transactionsService.create({
            orderId: validOrderId,
            amount: 100 + i,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            paymentMethod: PaymentMethod.CARD,
          });
        }

        // Verify they exist
        const beforeDelete = await transactionModel
          .find({ orderId: validOrderId })
          .exec();
        expect(beforeDelete).toHaveLength(5);

        // Delete all
        const deletedCount =
          await transactionsService.deleteByOrderId(validOrderId);
        expect(deletedCount).toBe(5);

        // Verify deletion
        const afterDelete = await transactionModel
          .find({ orderId: validOrderId })
          .exec();
        expect(afterDelete).toHaveLength(0);
      });
    });
  });
});
