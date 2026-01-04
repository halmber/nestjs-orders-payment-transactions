import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

interface OrderResponse {
  id: string;
  amount: number;
  status: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

@Injectable()
export class OrdersClientService {
  private readonly logger = new Logger(OrdersClientService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Validates if an order exists in the main service. In non-production environments,
   * if the order service is unreachable, it will log a warning and continue.
   * @param orderId - UUID of the order
   * @returns Order data if exists
   * @throws NotFoundException if order doesn't exist
   */
  async validateOrderExists(orderId: string): Promise<OrderResponse> {
    try {
      this.logger.debug(`Validating order exists: ${orderId}`);

      const response = await firstValueFrom(
        this.httpService.get<OrderResponse>(`/api/orders/${orderId}`),
      );

      this.logger.debug(`Order validated successfully: ${orderId}`);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          this.logger.warn(`Order not found: ${orderId}`);
          throw new NotFoundException(`Order with id '${orderId}' not found`);
        }

        if (process.env.NODE_ENV !== 'production') {
          this.logger.warn(
            `External service error, because it maybe offline. Continuing in non-production mode. Error was: ${error.message}`,
          );
          return;
        } else {
          this.logger.error(
            `Error validating order ${orderId}: ${error.message}`,
          );
          throw new Error(`Failed to validate order: ${error.message}`);
        }
      }

      throw error;
    }
  }

  /**
   * Gets order details (useful for additional validation)
   * @param orderId - UUID of the order
   * @returns Order data or null if not found
   */
  async getOrderDetails(orderId: string): Promise<OrderResponse | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<OrderResponse>(`/api/orders/${orderId}`),
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
}
