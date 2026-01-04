import { ApiProperty } from '@nestjs/swagger';

export class PaymentTransactionCountsResponseDto {
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
