import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
import { CreatePaymentTransactionDto } from './dto/request/create-transaction.dto';
import { GetPaymentTransactionsDto } from './dto/request/get-transactions.dto';
import { PaymentTransactionCountsRequestDto } from './dto/request/transaction-counts-request.dto';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let model: Model<PaymentTransactionDocument>;
  let ordersClientService: OrdersClientService;

  const mockTransactionDoc = {
    _id: 'mock-id-123',
    orderId: 'a1b2c3d4-1111-4444-8888-123456789001',
    amount: 150.5,
    currency: Currency.UAH,
    type: TransactionType.PAYMENT,
    status: TransactionStatus.COMPLETED,
    paymentMethod: PaymentMethod.CARD,
    transactionReference: 'TXN-001',
    description: 'Test transaction',
    transactionTime: new Date('2024-12-07T10:00:00Z'),
    processedBy: 'admin@test.com',
    metadata: { test: 'data' },
    createdAt: new Date('2024-12-07T09:00:00Z'),
    updatedAt: new Date('2024-12-07T09:00:00Z'),
    toString: () => 'mock-id-123',
  };

  const mockOrdersClientService = {
    validateOrderExists: jest.fn(),
    getOrderDetails: jest.fn(),
  };

  beforeEach(async () => {
    const mockModel = function (dto: any) {
      return {
        ...dto,
        _id: mockTransactionDoc._id,
        createdAt: mockTransactionDoc.createdAt,
        updatedAt: mockTransactionDoc.updatedAt,
        save: jest.fn().mockResolvedValue({
          ...mockTransactionDoc,
          ...dto,
        }),
      };
    };

    mockModel.find = jest.fn();
    mockModel.countDocuments = jest.fn();
    mockModel.deleteMany = jest.fn();
    mockModel.aggregate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getModelToken(PaymentTransaction.name),
          useValue: mockModel,
        },
        {
          provide: OrdersClientService,
          useValue: mockOrdersClientService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    model = module.get<Model<PaymentTransactionDocument>>(
      getModelToken(PaymentTransaction.name),
    );
    ordersClientService = module.get<OrdersClientService>(OrdersClientService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreatePaymentTransactionDto = {
      orderId: 'a1b2c3d4-1111-4444-8888-123456789001',
      amount: 150.5,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
      paymentMethod: PaymentMethod.CARD,
    };

    it('should create a transaction successfully', async () => {
      mockOrdersClientService.validateOrderExists.mockResolvedValue(true);

      const result = await service.create(createDto);

      expect(mockOrdersClientService.validateOrderExists).toHaveBeenCalledWith(
        createDto.orderId,
      );
      expect(result).toMatchObject({
        orderId: createDto.orderId,
        amount: createDto.amount,
        type: createDto.type,
        status: createDto.status,
        paymentMethod: createDto.paymentMethod,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should set default currency to UAH if not provided', async () => {
      mockOrdersClientService.validateOrderExists.mockResolvedValue(true);

      const result = await service.create(createDto);

      expect(result.currency).toBe(Currency.UAH);
    });

    it('should not override provided currency', async () => {
      mockOrdersClientService.validateOrderExists.mockResolvedValue(true);

      const dtoWithCurrency: CreatePaymentTransactionDto = {
        ...createDto,
        currency: Currency.USD,
      };

      const result = await service.create(dtoWithCurrency);

      expect(result.currency).toBe(Currency.USD);
    });

    it('should throw error if order does not exist', async () => {
      mockOrdersClientService.validateOrderExists.mockRejectedValue(
        new Error('Order not found'),
      );

      await expect(service.create(createDto)).rejects.toThrow(
        'Order not found',
      );
      expect(mockOrdersClientService.validateOrderExists).toHaveBeenCalledWith(
        createDto.orderId,
      );
    });

    it('should preserve custom transactionTime', async () => {
      mockOrdersClientService.validateOrderExists.mockResolvedValue(true);

      const customTime = new Date('2024-01-01T00:00:00Z');
      const dtoWithTime: CreatePaymentTransactionDto = {
        ...createDto,
        transactionTime: customTime,
      };

      const result = await service.create(dtoWithTime);

      expect(result.transactionTime).toEqual(customTime);
    });

    it('should include optional fields when provided', async () => {
      mockOrdersClientService.validateOrderExists.mockResolvedValue(true);

      const dtoWithOptionals: CreatePaymentTransactionDto = {
        ...createDto,
        transactionReference: 'TXN-12345',
        description: 'Payment for order',
        processedBy: 'admin@example.com',
        metadata: { gateway: 'stripe', last4: '4242' },
      };

      const result = await service.create(dtoWithOptionals);

      expect(result.transactionReference).toBe('TXN-12345');
      expect(result.description).toBe('Payment for order');
      expect(result.processedBy).toBe('admin@example.com');
      expect(result.metadata).toEqual({ gateway: 'stripe', last4: '4242' });
    });
  });

  describe('findByOrderId', () => {
    const orderId = 'a1b2c3d4-1111-4444-8888-123456789001';

    it('should return transactions for an order with default pagination', async () => {
      const mockTransactions = [
        { ...mockTransactionDoc, amount: 100 },
        { ...mockTransactionDoc, amount: 200 },
      ];

      const mockExec = jest.fn().mockResolvedValue(mockTransactions);
      const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (model.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const dto: GetPaymentTransactionsDto = {
        orderId,
        size: 10,
        from: 0,
      };

      const result = await service.findByOrderId(dto);

      expect(model.find).toHaveBeenCalledWith({ orderId });
      expect(mockSort).toHaveBeenCalledWith({ transactionTime: -1 });
      expect(mockSkip).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(100);
      expect(result[1].amount).toBe(200);
    });

    it('should apply custom pagination correctly', async () => {
      const mockTransactions = [{ ...mockTransactionDoc, amount: 300 }];

      const mockExec = jest.fn().mockResolvedValue(mockTransactions);
      const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (model.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const dto: GetPaymentTransactionsDto = {
        orderId,
        size: 5,
        from: 10,
      };

      await service.findByOrderId(dto);

      expect(mockSkip).toHaveBeenCalledWith(10);
      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it('should return empty array if no transactions found', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (model.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const dto: GetPaymentTransactionsDto = {
        orderId,
        size: 10,
        from: 0,
      };

      const result = await service.findByOrderId(dto);

      expect(result).toEqual([]);
    });

    it('should map transactions to response DTOs correctly', async () => {
      const mockTransactions = [mockTransactionDoc];

      const mockExec = jest.fn().mockResolvedValue(mockTransactions);
      const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (model.find as jest.Mock).mockReturnValue({ sort: mockSort });

      const dto: GetPaymentTransactionsDto = {
        orderId,
        size: 10,
        from: 0,
      };

      const result = await service.findByOrderId(dto);

      expect(result[0]).toMatchObject({
        id: mockTransactionDoc._id,
        orderId: mockTransactionDoc.orderId,
        amount: mockTransactionDoc.amount,
        currency: mockTransactionDoc.currency,
        type: mockTransactionDoc.type,
        status: mockTransactionDoc.status,
        paymentMethod: mockTransactionDoc.paymentMethod,
      });
    });
  });

  describe('getCountsByOrderIds', () => {
    it('should return counts for multiple orders', async () => {
      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds: ['order-1', 'order-2', 'order-3'],
      };

      const aggregationResult = [
        { _id: 'order-1', count: 5 },
        { _id: 'order-2', count: 3 },
      ];

      (model.aggregate as jest.Mock).mockResolvedValue(aggregationResult);

      const result = await service.getCountsByOrderIds(requestDto);

      expect(model.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            orderId: { $in: requestDto.orderIds },
          },
        },
        {
          $group: {
            _id: '$orderId',
            count: { $sum: 1 },
          },
        },
      ]);

      expect(result).toEqual({
        'order-1': 5,
        'order-2': 3,
        'order-3': 0,
      });
    });

    it('should return 0 for orders with no transactions', async () => {
      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds: ['order-1', 'order-2'],
      };

      (model.aggregate as jest.Mock).mockResolvedValue([]);

      const result = await service.getCountsByOrderIds(requestDto);

      expect(result).toEqual({
        'order-1': 0,
        'order-2': 0,
      });
    });

    it('should handle single order ID', async () => {
      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds: ['order-1'],
      };

      const aggregationResult = [{ _id: 'order-1', count: 10 }];

      (model.aggregate as jest.Mock).mockResolvedValue(aggregationResult);

      const result = await service.getCountsByOrderIds(requestDto);

      expect(result).toEqual({
        'order-1': 10,
      });
    });

    it('should initialize all order IDs with 0 before counting', async () => {
      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds: ['order-1', 'order-2', 'order-3'],
      };

      const aggregationResult = [{ _id: 'order-1', count: 5 }];

      (model.aggregate as jest.Mock).mockResolvedValue(aggregationResult);

      const result = await service.getCountsByOrderIds(requestDto);

      expect(result['order-1']).toBe(5);
      expect(result['order-2']).toBe(0);
      expect(result['order-3']).toBe(0);
    });

    it('should handle empty order IDs array', async () => {
      const requestDto: PaymentTransactionCountsRequestDto = {
        orderIds: [],
      };

      (model.aggregate as jest.Mock).mockResolvedValue([]);

      const result = await service.getCountsByOrderIds(requestDto);

      expect(result).toEqual({});
    });
  });

  describe('getTotalCountByOrderId', () => {
    it('should return count for a specific order', async () => {
      const orderId = 'order-1';
      const mockExec = jest.fn().mockResolvedValue(5);
      (model.countDocuments as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await service.getTotalCountByOrderId(orderId);

      expect(model.countDocuments).toHaveBeenCalledWith({ orderId });
      expect(result).toBe(5);
    });

    it('should return 0 if no transactions found', async () => {
      const orderId = 'order-1';
      const mockExec = jest.fn().mockResolvedValue(0);
      (model.countDocuments as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await service.getTotalCountByOrderId(orderId);

      expect(result).toBe(0);
    });
  });

  describe('deleteByOrderId', () => {
    it('should delete all transactions for an order', async () => {
      const orderId = 'order-1';
      const mockExec = jest.fn().mockResolvedValue({ deletedCount: 5 });
      (model.deleteMany as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await service.deleteByOrderId(orderId);

      expect(model.deleteMany).toHaveBeenCalledWith({ orderId });
      expect(result).toBe(5);
    });

    it('should return 0 if no transactions to delete', async () => {
      const orderId = 'order-1';
      const mockExec = jest.fn().mockResolvedValue({ deletedCount: 0 });
      (model.deleteMany as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await service.deleteByOrderId(orderId);

      expect(result).toBe(0);
    });
  });
});
