import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TransactionsModule } from '../../src/transactions/transactions.module';
import { TransactionsService } from '../../src/transactions/transactions.service';
import { OrdersClientService } from '../../src/orders/orders-client.service';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  Currency,
} from '../../src/transactions/schemas/payment-transaction.schema';

describe('TransactionsController (e2e)', () => {
  let app: INestApplication<App>;
  let transactionsService: TransactionsService;
  let ordersClientService: OrdersClientService;

  const validOrderId = 'a1b2c3d4-1111-4444-8888-123456789001';
  const validOrderId2 = 'a1b2c3d4-1111-4444-8888-123456789002';
  const validOrderId3 = 'a1b2c3d4-1111-4444-8888-123456789003';

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
          if (
            orderId === validOrderId ||
            orderId === validOrderId2 ||
            orderId === validOrderId3
          ) {
            return {
              id: orderId,
              amount: 150.5,
              status: 'NEW',
              customer: {
                id: '67da6e0e-6e6b-4774-851d-35093e56c26f',
                firstName: 'John',
                lastName: 'Doe',
              },
            };
          }
          throw { response: { status: 404 } };
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    transactionsService =
      moduleFixture.get<TransactionsService>(TransactionsService);
    ordersClientService =
      moduleFixture.get<OrdersClientService>(OrdersClientService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up transactions before each test
    await transactionsService.deleteByOrderId(validOrderId);
    await transactionsService.deleteByOrderId(validOrderId2);
    await transactionsService.deleteByOrderId(validOrderId3);
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction successfully', async () => {
      const createDto = {
        orderId: validOrderId,
        amount: 150.5,
        currency: Currency.UAH,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
        description: 'Payment for order',
        transactionReference: 'TXN-001',
      };

      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.orderId).toBe(validOrderId);
      expect(response.body.amount).toBe(150.5);
      expect(response.body.currency).toBe(Currency.UAH);
      expect(response.body.type).toBe(TransactionType.PAYMENT);
      expect(response.body.status).toBe(TransactionStatus.COMPLETED);
      expect(response.body.paymentMethod).toBe(PaymentMethod.CARD);
      expect(response.body).toHaveProperty('transactionTime');
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should auto-generate transaction time if not provided', async () => {
      const createDto = {
        orderId: validOrderId,
        amount: 100.0,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.PENDING,
        paymentMethod: PaymentMethod.CASH,
      };

      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('transactionTime');
      expect(new Date(response.body.transactionTime)).toBeInstanceOf(Date);
    });

    it('should use default currency UAH if not provided', async () => {
      const createDto = {
        orderId: validOrderId,
        amount: 100.0,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
      };

      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .send(createDto)
        .expect(201);

      expect(response.body.currency).toBe(Currency.UAH);
    });

    it('should create a refund transaction', async () => {
      const createDto = {
        orderId: validOrderId,
        amount: 150.0,
        currency: Currency.USD,
        type: TransactionType.REFUND,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
        description: 'Refund for returned items',
      };

      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .send(createDto)
        .expect(201);

      expect(response.body.type).toBe(TransactionType.REFUND);
      expect(response.body.currency).toBe(Currency.USD);
    });

    it('should reject invalid amount (negative)', async () => {
      const createDto = {
        orderId: validOrderId,
        amount: -50.0,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
      };

      await request(app.getHttpServer())
        .post('/api/transactions')
        .send(createDto)
        .expect(400);
    });

    it('should reject invalid UUID format', async () => {
      const createDto = {
        orderId: 'invalid-uuid',
        amount: 100.0,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
      };

      await request(app.getHttpServer())
        .post('/api/transactions')
        .send(createDto)
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      const createDto = {
        orderId: validOrderId,
        amount: 100.0,
        // Missing type, status and paymentMethod
      };

      await request(app.getHttpServer())
        .post('/api/transactions')
        .send(createDto)
        .expect(400);
    });

    it('should accept custom transaction time', async () => {
      const customTime = new Date('2024-01-01T10:00:00Z');
      const createDto = {
        orderId: validOrderId,
        amount: 200.0,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.PAYPAL,
        transactionTime: customTime.toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .send(createDto)
        .expect(201);

      expect(new Date(response.body.transactionTime).getTime()).toBe(
        customTime.getTime(),
      );
    });

    it('should accept optional metadata', async () => {
      const createDto = {
        orderId: validOrderId,
        amount: 100.0,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
        metadata: {
          gateway: 'stripe',
          cardLast4: '4242',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .send(createDto)
        .expect(201);

      expect(response.body.metadata).toEqual({
        gateway: 'stripe',
        cardLast4: '4242',
      });
    });

    it('should accept different currencies', async () => {
      const currencies = [Currency.USD, Currency.EUR, Currency.GBP];

      for (const currency of currencies) {
        const createDto = {
          orderId: validOrderId,
          amount: 100.0,
          currency,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        };

        const response = await request(app.getHttpServer())
          .post('/api/transactions')
          .send(createDto)
          .expect(201);

        expect(response.body.currency).toBe(currency);
      }
    });
  });

  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      // Create test transactions with SAME orderId but different timestamps
      const transactions = [
        {
          orderId: validOrderId,
          amount: 100.0,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
          transactionTime: new Date('2024-01-01T10:00:00Z'),
        },
        {
          orderId: validOrderId, // Same orderId
          amount: 50.0,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CASH,
          transactionTime: new Date('2024-01-02T10:00:00Z'),
        },
        {
          orderId: validOrderId, // Same orderId
          amount: 75.0,
          type: TransactionType.REFUND,
          status: TransactionStatus.PENDING,
          paymentMethod: PaymentMethod.PAYPAL,
          transactionTime: new Date('2024-01-03T10:00:00Z'),
        },
      ];

      for (const tx of transactions) {
        await transactionsService.create(tx);
      }
    });

    it('should return transactions sorted by time descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ orderId: validOrderId, size: 10, from: 0 })
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].amount).toBe(75.0); // Most recent
      expect(response.body[1].amount).toBe(50.0);
      expect(response.body[2].amount).toBe(100.0); // Oldest
    });

    it('should support pagination with size parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ orderId: validOrderId, size: 2, from: 0 })
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].amount).toBe(75.0);
      expect(response.body[1].amount).toBe(50.0);
    });

    it('should support pagination with from parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ orderId: validOrderId, size: 10, from: 1 })
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].amount).toBe(50.0);
      expect(response.body[1].amount).toBe(100.0);
    });

    it('should return empty array for order with no transactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ orderId: validOrderId2, size: 10, from: 0 }) // validOrderId2 has no transactions
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should require orderId parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ size: 10, from: 0 })
        .expect(400);
    });

    it('should validate UUID format for orderId', async () => {
      await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ orderId: 'invalid-uuid', size: 10, from: 0 })
        .expect(400);
    });

    it('should use default values for size and from', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ orderId: validOrderId })
        .expect(200);

      expect(response.body).toHaveLength(3);
    });

    it('should enforce max size limit', async () => {
      await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ orderId: validOrderId, size: 101 })
        .expect(400);
    });
  });

  describe('POST /api/transactions/_counts', () => {
    beforeEach(async () => {
      // Create transactions for multiple orders
      await transactionsService.create({
        orderId: validOrderId,
        amount: 100,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
      });
      await transactionsService.create({
        orderId: validOrderId,
        amount: 50,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
      });
      await transactionsService.create({
        orderId: validOrderId,
        amount: 75,
        type: TransactionType.REFUND,
        status: TransactionStatus.PENDING,
        paymentMethod: PaymentMethod.CASH,
      });

      await transactionsService.create({
        orderId: validOrderId2,
        amount: 200,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.PAYPAL,
      });
    });

    it('should return correct counts for multiple orders', async () => {
      const requestDto = {
        orderIds: [validOrderId, validOrderId2, validOrderId3],
      };

      const response = await request(app.getHttpServer())
        .post('/api/transactions/_counts')
        .send(requestDto)
        .expect(200);

      expect(response.body.counts).toEqual({
        [validOrderId]: 3,
        [validOrderId2]: 1,
        [validOrderId3]: 0,
      });
    });

    it('should return 0 for orders with no transactions', async () => {
      const requestDto = {
        orderIds: [validOrderId3],
      };

      const response = await request(app.getHttpServer())
        .post('/api/transactions/_counts')
        .send(requestDto)
        .expect(200);

      expect(response.body.counts).toEqual({
        [validOrderId3]: 0,
      });
    });

    it('should handle single order ID', async () => {
      const requestDto = {
        orderIds: [validOrderId],
      };

      const response = await request(app.getHttpServer())
        .post('/api/transactions/_counts')
        .send(requestDto)
        .expect(200);

      expect(response.body.counts).toEqual({
        [validOrderId]: 3,
      });
    });

    it('should reject empty array', async () => {
      const requestDto = {
        orderIds: [],
      };

      await request(app.getHttpServer())
        .post('/api/transactions/_counts')
        .send(requestDto)
        .expect(400);
    });

    it('should validate UUID format in array', async () => {
      const requestDto = {
        orderIds: ['invalid-uuid', validOrderId],
      };

      await request(app.getHttpServer())
        .post('/api/transactions/_counts')
        .send(requestDto)
        .expect(400);
    });

    it('should require orderIds field', async () => {
      await request(app.getHttpServer())
        .post('/api/transactions/_counts')
        .send({})
        .expect(400);
    });

    it('should handle large number of order IDs', async () => {
      const orderIds = Array(50)
        .fill(null)
        .map(() => validOrderId3);

      const requestDto = {
        orderIds: orderIds,
      };

      const response = await request(app.getHttpServer())
        .post('/api/transactions/_counts')
        .send(requestDto)
        .expect(200);

      expect(Object.keys(response.body.counts).length).toBe(1);
      expect(response.body.counts[validOrderId3]).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow: create and retrieve', async () => {
      // Create transaction
      const createDto = {
        orderId: validOrderId,
        amount: 299.99,
        currency: Currency.USD,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
        description: 'Full payment',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/transactions')
        .send(createDto)
        .expect(201);

      const transactionId = createResponse.body.id;

      // Retrieve transactions
      const getResponse = await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ orderId: validOrderId, size: 10, from: 0 })
        .expect(200);

      expect(getResponse.body).toHaveLength(1);
      expect(getResponse.body[0].id).toBe(transactionId);
      expect(getResponse.body[0].amount).toBe(299.99);
      expect(getResponse.body[0].currency).toBe(Currency.USD);
    });

    it('should handle multiple transactions for same order', async () => {
      // Create multiple transactions
      const transactions = [
        {
          orderId: validOrderId,
          amount: 100,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        },
        {
          orderId: validOrderId,
          amount: 50,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CASH,
        },
      ];

      for (const tx of transactions) {
        await request(app.getHttpServer())
          .post('/api/transactions')
          .send(tx)
          .expect(201);
      }

      // Get counts
      const countsResponse = await request(app.getHttpServer())
        .post('/api/transactions/_counts')
        .send({ orderIds: [validOrderId] })
        .expect(200);

      expect(countsResponse.body.counts[validOrderId]).toBe(2);

      // Get transactions
      const getResponse = await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ orderId: validOrderId })
        .expect(200);

      expect(getResponse.body).toHaveLength(2);
    });

    it('should handle payment and refund workflow', async () => {
      // Create payment
      await request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          orderId: validOrderId,
          amount: 200,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        })
        .expect(201);

      // Create refund
      await request(app.getHttpServer())
        .post('/api/transactions')
        .send({
          orderId: validOrderId,
          amount: 200,
          type: TransactionType.REFUND,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
          description: 'Full refund',
        })
        .expect(201);

      // Get all transactions
      const getResponse = await request(app.getHttpServer())
        .get('/api/transactions')
        .query({ orderId: validOrderId })
        .expect(200);

      expect(getResponse.body).toHaveLength(2);
      expect(getResponse.body[0].type).toBe(TransactionType.REFUND); // Most recent
      expect(getResponse.body[1].type).toBe(TransactionType.PAYMENT);
    });
  });
});
