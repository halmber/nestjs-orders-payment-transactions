import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class PaymentTransactionCountsRequestDto {
  @ApiProperty({
    description: 'Array of Order IDs',
    example: [
      'e7c4ff4c-5fcd-4d03-bed1-9cb8a12ff8dc',
      'a1b2c3d4-1111-4444-8888-123456789002',
      'a1b2c3d4-1111-4444-8888-123456789003',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  orderIds: string[];
}
