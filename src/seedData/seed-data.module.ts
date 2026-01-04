import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from '../transactions/schemas/payment-transaction.schema';
import { SeedDataService } from './seed-data.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
    ]),
  ],
  providers: [SeedDataService],
})
export class SeedDataModule implements OnModuleInit {
  constructor(private readonly seedDataService: SeedDataService) {}

  async onModuleInit() {
    // Seed data only in development
    if (process.env.NODE_ENV !== 'production') {
      await this.seedDataService.seedTransactions();
    }
  }
}
