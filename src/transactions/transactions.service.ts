import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PaymentTransaction,
  PaymentTransactionDocument,
  Currency,
} from './schemas/payment-transaction.schema';
import { CreatePaymentTransactionDto } from './dto/request/create-transaction.dto';
import { GetPaymentTransactionsDto } from './dto/request/get-transactions.dto';
import { PaymentTransactionCountsRequestDto } from './dto/request/transaction-counts-request.dto';
import { OrdersClientService } from '../orders/orders-client.service';
import { PaymentTransactionResponseDto } from './dto/response/transaction-response.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(PaymentTransaction.name)
    private transactionModel: Model<PaymentTransactionDocument>,
    private ordersClientService: OrdersClientService,
  ) {}

  /**
   * Creates a new transaction after validating the order exists
   */
  async create(
    createTransactionDto: CreatePaymentTransactionDto,
  ): Promise<PaymentTransactionResponseDto> {
    this.logger.log(
      `Creating transaction for order: ${createTransactionDto.orderId}`,
    );

    // Validate that order exists in order service
    await this.ordersClientService.validateOrderExists(
      createTransactionDto.orderId,
    );

    // If transactionTime is not provided, use current time
    if (!createTransactionDto.transactionTime) {
      createTransactionDto.transactionTime = new Date();
    }

    // Set default currency if not provided
    if (!createTransactionDto.currency) {
      createTransactionDto.currency = Currency.UAH;
    }

    const createdTransaction = new this.transactionModel(createTransactionDto);
    const saved = await createdTransaction.save();

    this.logger.log(`Transaction created: ${saved._id}`);
    return this.mapToResponseDto(saved);
  }

  /**
   * Gets transactions for a specific order, sorted by time descending
   */
  async findByOrderId(
    getTransactionsDto: GetPaymentTransactionsDto,
  ): Promise<PaymentTransactionResponseDto[]> {
    const { orderId, size, from } = getTransactionsDto;

    this.logger.debug(
      `Fetching transactions for order: ${orderId}, size: ${size}, from: ${from}`,
    );

    const transactions = await this.transactionModel
      .find({ orderId: orderId })
      .sort({ transactionTime: -1 })
      .skip(from)
      .limit(size)
      .exec();

    this.logger.debug(
      `Found ${transactions.length} transactions for order ${orderId}`,
    );

    return transactions.map((tx) => this.mapToResponseDto(tx));
  }

  /**
   * Gets transaction counts for multiple orders using aggregation
   * This avoids loading actual transaction objects
   */
  async getCountsByOrderIds(
    requestDto: PaymentTransactionCountsRequestDto,
  ): Promise<Record<string, number>> {
    const { orderIds } = requestDto;

    this.logger.debug(
      `Getting transaction counts for ${orderIds.length} orders`,
    );

    // Use aggregation to count transactions per order
    const aggregationResult = await this.transactionModel.aggregate([
      {
        $match: {
          orderId: { $in: orderIds },
        },
      },
      {
        $group: {
          _id: '$orderId',
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert aggregation result to object format
    const counts: Record<string, number> = {};

    // Initialize all order IDs with 0
    orderIds.forEach((orderId) => {
      counts[orderId] = 0;
    });

    // Update with actual counts
    aggregationResult.forEach((result) => {
      counts[result._id] = result.count;
    });

    this.logger.debug(
      `Transaction counts calculated for ${orderIds.length} orders`,
    );

    return counts;
  }

  /**
   * Utility method to get total count for an order
   */
  async getTotalCountByOrderId(orderId: string): Promise<number> {
    return this.transactionModel.countDocuments({ orderId }).exec();
  }

  /**
   * Utility method to delete all transactions for an order (useful for testing)
   */
  async deleteByOrderId(orderId: string): Promise<number> {
    const result = await this.transactionModel.deleteMany({ orderId }).exec();
    return result.deletedCount;
  }

  private mapToResponseDto(
    transaction: PaymentTransactionDocument,
  ): PaymentTransactionResponseDto {
    return {
      id: transaction._id.toString(),
      orderId: transaction.orderId,
      amount: transaction.amount,
      currency: transaction.currency,
      type: transaction.type,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      transactionReference: transaction.transactionReference,
      description: transaction.description,
      transactionTime: transaction.transactionTime,
      processedBy: transaction.processedBy,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
