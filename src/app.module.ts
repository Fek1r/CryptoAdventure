import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketDataModule } from './market-data/market-data.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MarketDataModule,
    StorageModule,
  ],
})
export class AppModule {}