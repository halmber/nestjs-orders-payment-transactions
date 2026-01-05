import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreatePaymentTransactionDto } from './dto/request/create-transaction.dto';
import { GetPaymentTransactionsDto } from './dto/request/get-transactions.dto';
import { PaymentTransactionCountsRequestDto } from './dto/request/transaction-counts-request.dto';
import { PaymentTransactionResponseDto } from './dto/response/transaction-response.dto';
import { PaymentTransactionCountsResponseDto } from './dto/response/transaction-counts-response.dto';

@ApiTags('Payment Transactions')
@Controller('api/transactions')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new payment transaction',
    description:
      'Creates a new payment transaction for an order. Validates that the order exists in the main service. ' +
      'Transaction time is auto-generated if not provided. Currency defaults to UAH if not specified. ' +
      'Use type PAYMENT for regular payments and REFUND for refunds.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    type: PaymentTransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async create(
    @Body() createTransactionDto: CreatePaymentTransactionDto,
  ): Promise<PaymentTransactionResponseDto> {
    return await this.transactionsService.create(createTransactionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get transactions for an order',
    description:
      'Returns list of transactions for a specific order, sorted by transaction time in descending order (most recent first). Supports pagination.',
  })
  @ApiQuery({
    name: 'orderId',
    description: 'Order ID (UUID)',
    required: true,
    example: 'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
  })
  @ApiQuery({
    name: 'size',
    description: 'Maximum number of items to return',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'from',
    description: 'Starting index for pagination',
    required: false,
    type: Number,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of transactions',
    type: [PaymentTransactionResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  async findByOrder(
    @Query() getTransactionsDto: GetPaymentTransactionsDto,
  ): Promise<PaymentTransactionResponseDto[]> {
    return await this.transactionsService.findByOrderId(getTransactionsDto);
  }

  @Post('_counts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get transaction counts for multiple orders',
    description:
      'Accepts an array of order IDs and returns the total count of transactions for each order. Uses aggregation query for efficiency without loading actual transaction objects.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction counts by order ID',
    type: PaymentTransactionCountsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async getCounts(
    @Body() requestDto: PaymentTransactionCountsRequestDto,
  ): Promise<PaymentTransactionCountsResponseDto> {
    return {
      counts: await this.transactionsService.getCountsByOrderIds(requestDto),
    };
  }
}
