import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { CreatePaymentTransactionDto } from './dto/request/create-transaction.dto';
import { GetPaymentTransactionsDto } from './dto/request/get-transactions.dto';
import { PaymentTransactionCountsRequestDto } from './dto/request/transaction-counts-request.dto';
import { PaymentTransactionResponseDto } from './dto/response/transaction-response.dto';
import {
  TransactionType,
  TransactionStatus,
  PaymentMethod,
  Currency,
} from './schemas/payment-transaction.schema';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  const mockTransactionsService = {
    create: jest.fn(),
    findByOrderId: jest.fn(),
    getCountsByOrderIds: jest.fn(),
  };

  const mockTransaction: PaymentTransactionResponseDto = {
    id: '507f1f77bcf86cd799439011',
    orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
    amount: 150.5,
    currency: Currency.UAH,
    type: TransactionType.PAYMENT,
    status: TransactionStatus.COMPLETED,
    paymentMethod: PaymentMethod.CARD,
    transactionReference: 'TXN-001',
    description: 'Payment for order',
    transactionTime: new Date('2024-01-01T10:00:00Z'),
    processedBy: 'admin@example.com',
    metadata: { gateway: 'stripe' },
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new transaction', async () => {
      const createDto: CreatePaymentTransactionDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        amount: 150.5,
        currency: Currency.UAH,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
        transactionReference: 'TXN-001',
        description: 'Payment for order',
      };

      mockTransactionsService.create.mockResolvedValue(mockTransaction);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockTransaction);
      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should create a transaction with minimal required fields', async () => {
      const createDto: CreatePaymentTransactionDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        amount: 100.0,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.PENDING,
        paymentMethod: PaymentMethod.CASH,
      };

      const minimalTransaction = {
        ...mockTransaction,
        amount: 100.0,
        status: TransactionStatus.PENDING,
        paymentMethod: PaymentMethod.CASH,
        transactionReference: undefined,
        description: undefined,
      };

      mockTransactionsService.create.mockResolvedValue(minimalTransaction);

      const result = await controller.create(createDto);

      expect(result).toEqual(minimalTransaction);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should create a refund transaction', async () => {
      const createDto: CreatePaymentTransactionDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        amount: 150.5,
        currency: Currency.USD,
        type: TransactionType.REFUND,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
        description: 'Refund for returned items',
      };

      const refundTransaction = {
        ...mockTransaction,
        type: TransactionType.REFUND,
        currency: Currency.USD,
        description: 'Refund for returned items',
      };

      mockTransactionsService.create.mockResolvedValue(refundTransaction);

      const result = await controller.create(createDto);

      expect(result).toEqual(refundTransaction);
      expect(result.type).toBe(TransactionType.REFUND);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle transaction with custom time', async () => {
      const customTime = new Date('2024-01-15T14:30:00Z');
      const createDto: CreatePaymentTransactionDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        amount: 200.0,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.PAYPAL,
        transactionTime: customTime,
      };

      const customTimeTransaction = {
        ...mockTransaction,
        amount: 200.0,
        transactionTime: customTime,
      };

      mockTransactionsService.create.mockResolvedValue(customTimeTransaction);

      const result = await controller.create(createDto);

      expect(result.transactionTime).toEqual(customTime);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle transaction with metadata', async () => {
      const createDto: CreatePaymentTransactionDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        amount: 100.0,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
        metadata: {
          gateway: 'stripe',
          cardLast4: '4242',
          customField: 'value',
        },
      };

      const metadataTransaction = {
        ...mockTransaction,
        amount: 100.0,
        metadata: {
          gateway: 'stripe',
          cardLast4: '4242',
          customField: 'value',
        },
      };

      mockTransactionsService.create.mockResolvedValue(metadataTransaction);

      const result = await controller.create(createDto);

      expect(result.metadata).toEqual(createDto.metadata);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate service errors', async () => {
      const createDto: CreatePaymentTransactionDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        amount: 150.5,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.COMPLETED,
        paymentMethod: PaymentMethod.CARD,
      };

      const error = new Error('Order not found');
      mockTransactionsService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(
        'Order not found',
      );
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findByOrder', () => {
    it('should return transactions for an order', async () => {
      const getDto: GetPaymentTransactionsDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        size: 10,
        from: 0,
      };

      const transactions = [mockTransaction];
      mockTransactionsService.findByOrderId.mockResolvedValue(transactions);

      const result = await controller.findByOrder(getDto);

      expect(result).toEqual(transactions);
      expect(service.findByOrderId).toHaveBeenCalledWith(getDto);
      expect(service.findByOrderId).toHaveBeenCalledTimes(1);
    });

    it('should return multiple transactions sorted by time', async () => {
      const getDto: GetPaymentTransactionsDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        size: 10,
        from: 0,
      };

      const transactions = [
        {
          ...mockTransaction,
          amount: 75.0,
          transactionTime: new Date('2024-01-03T10:00:00Z'),
        },
        {
          ...mockTransaction,
          amount: 50.0,
          transactionTime: new Date('2024-01-02T10:00:00Z'),
        },
        {
          ...mockTransaction,
          amount: 100.0,
          transactionTime: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      mockTransactionsService.findByOrderId.mockResolvedValue(transactions);

      const result = await controller.findByOrder(getDto);

      expect(result).toEqual(transactions);
      expect(result).toHaveLength(3);
      expect(result[0].amount).toBe(75.0); // Most recent
      expect(service.findByOrderId).toHaveBeenCalledWith(getDto);
    });

    it('should handle pagination with size parameter', async () => {
      const getDto: GetPaymentTransactionsDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        size: 2,
        from: 0,
      };

      const transactions = [
        { ...mockTransaction, amount: 75.0 },
        { ...mockTransaction, amount: 50.0 },
      ];

      mockTransactionsService.findByOrderId.mockResolvedValue(transactions);

      const result = await controller.findByOrder(getDto);

      expect(result).toHaveLength(2);
      expect(service.findByOrderId).toHaveBeenCalledWith(getDto);
    });

    it('should handle pagination with from parameter', async () => {
      const getDto: GetPaymentTransactionsDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        size: 10,
        from: 5,
      };

      const transactions = [
        { ...mockTransaction, amount: 50.0 },
        { ...mockTransaction, amount: 100.0 },
      ];

      mockTransactionsService.findByOrderId.mockResolvedValue(transactions);

      const result = await controller.findByOrder(getDto);

      expect(result).toEqual(transactions);
      expect(service.findByOrderId).toHaveBeenCalledWith(getDto);
    });

    it('should return empty array when no transactions found', async () => {
      const getDto: GetPaymentTransactionsDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        size: 10,
        from: 0,
      };

      mockTransactionsService.findByOrderId.mockResolvedValue([]);

      const result = await controller.findByOrder(getDto);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(service.findByOrderId).toHaveBeenCalledWith(getDto);
    });

    it('should use default values when size and from are not provided', async () => {
      const getDto: GetPaymentTransactionsDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
      };

      const transactions = [mockTransaction];
      mockTransactionsService.findByOrderId.mockResolvedValue(transactions);

      const result = await controller.findByOrder(getDto);

      expect(result).toEqual(transactions);
      expect(service.findByOrderId).toHaveBeenCalledWith(getDto);
    });

    it('should propagate service errors', async () => {
      const getDto: GetPaymentTransactionsDto = {
        orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
        size: 10,
        from: 0,
      };

      const error = new Error('Database connection failed');
      mockTransactionsService.findByOrderId.mockRejectedValue(error);

      await expect(controller.findByOrder(getDto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(service.findByOrderId).toHaveBeenCalledWith(getDto);
    });
  });

  describe('getCounts', () => {
    it('should return transaction counts for multiple orders', async () => {
      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds: [
          'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
          'a1b2c3d4-1111-4444-8888-123456789002',
          'a1b2c3d4-1111-4444-8888-123456789003',
        ],
      };

      const counts = {
        'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc': 5,
        'a1b2c3d4-1111-4444-8888-123456789002': 2,
        'a1b2c3d4-1111-4444-8888-123456789003': 0,
      };

      mockTransactionsService.getCountsByOrderIds.mockResolvedValue(counts);

      const result = await controller.getCounts(requestDto);

      expect(result).toEqual({ counts });
      expect(service.getCountsByOrderIds).toHaveBeenCalledWith(requestDto);
      expect(service.getCountsByOrderIds).toHaveBeenCalledTimes(1);
    });

    it('should return 0 for orders with no transactions', async () => {
      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds: ['a1b2c3d4-1111-4444-8888-123456789003'],
      };

      const counts = {
        'a1b2c3d4-1111-4444-8888-123456789003': 0,
      };

      mockTransactionsService.getCountsByOrderIds.mockResolvedValue(counts);

      const result = await controller.getCounts(requestDto);

      expect(result).toEqual({ counts });
      expect(result.counts['a1b2c3d4-1111-4444-8888-123456789003']).toBe(0);
      expect(service.getCountsByOrderIds).toHaveBeenCalledWith(requestDto);
    });

    it('should handle single order ID', async () => {
      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds: ['e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc'],
      };

      const counts = {
        'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc': 3,
      };

      mockTransactionsService.getCountsByOrderIds.mockResolvedValue(counts);

      const result = await controller.getCounts(requestDto);

      expect(result).toEqual({ counts });
      expect(Object.keys(result.counts)).toHaveLength(1);
      expect(service.getCountsByOrderIds).toHaveBeenCalledWith(requestDto);
    });

    it('should handle large number of order IDs', async () => {
      const orderIds = Array(50)
        .fill(null)
        .map(
          (_, i) =>
            `order-${i}-uuid-4444-8888-123456789${String(i).padStart(3, '0')}`,
        );

      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds,
      };

      const counts = orderIds.reduce(
        (acc, orderId) => {
          acc[orderId] = Math.floor(Math.random() * 10);
          return acc;
        },
        {} as Record<string, number>,
      );

      mockTransactionsService.getCountsByOrderIds.mockResolvedValue(counts);

      const result = await controller.getCounts(requestDto);

      expect(result.counts).toEqual(counts);
      expect(Object.keys(result.counts)).toHaveLength(50);
      expect(service.getCountsByOrderIds).toHaveBeenCalledWith(requestDto);
    });

    it('should return empty counts object for empty result', async () => {
      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds: ['e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc'],
      };

      mockTransactionsService.getCountsByOrderIds.mockResolvedValue({});

      const result = await controller.getCounts(requestDto);

      expect(result).toEqual({ counts: {} });
      expect(Object.keys(result.counts)).toHaveLength(0);
      expect(service.getCountsByOrderIds).toHaveBeenCalledWith(requestDto);
    });

    it('should propagate service errors', async () => {
      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds: ['e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc'],
      };

      const error = new Error('Aggregation query failed');
      mockTransactionsService.getCountsByOrderIds.mockRejectedValue(error);

      await expect(controller.getCounts(requestDto)).rejects.toThrow(
        'Aggregation query failed',
      );
      expect(service.getCountsByOrderIds).toHaveBeenCalledWith(requestDto);
    });
  });

  describe('Edge cases', () => {
    it('should handle different currencies in create', async () => {
      const currencies = [
        Currency.USD,
        Currency.EUR,
        Currency.GBP,
        Currency.UAH,
      ];

      for (const currency of currencies) {
        const createDto: CreatePaymentTransactionDto = {
          orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
          amount: 100.0,
          currency,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.CARD,
        };

        const transaction = { ...mockTransaction, currency };
        mockTransactionsService.create.mockResolvedValue(transaction);

        const result = await controller.create(createDto);

        expect(result.currency).toBe(currency);
      }

      expect(service.create).toHaveBeenCalledTimes(currencies.length);
    });

    it('should handle different payment methods', async () => {
      const methods = [
        PaymentMethod.CARD,
        PaymentMethod.CASH,
        PaymentMethod.PAYPAL,
      ];

      for (const method of methods) {
        const createDto: CreatePaymentTransactionDto = {
          orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
          amount: 100.0,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.COMPLETED,
          paymentMethod: method,
        };

        const transaction = { ...mockTransaction, paymentMethod: method };
        mockTransactionsService.create.mockResolvedValue(transaction);

        const result = await controller.create(createDto);

        expect(result.paymentMethod).toBe(method);
      }

      expect(service.create).toHaveBeenCalledTimes(methods.length);
    });

    it('should handle different transaction statuses', async () => {
      const statuses = [
        TransactionStatus.PENDING,
        TransactionStatus.COMPLETED,
        TransactionStatus.FAILED,
      ];

      for (const status of statuses) {
        const createDto: CreatePaymentTransactionDto = {
          orderId: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
          amount: 100.0,
          type: TransactionType.PAYMENT,
          status,
          paymentMethod: PaymentMethod.CARD,
        };

        const transaction = { ...mockTransaction, status };
        mockTransactionsService.create.mockResolvedValue(transaction);

        const result = await controller.create(createDto);

        expect(result.status).toBe(status);
      }

      expect(service.create).toHaveBeenCalledTimes(statuses.length);
    });
  });
});
