import { Module } from '@nestjs/common';
import { MarketDataModule } from './market-data/market-data.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [MarketDataModule, StorageModule],
})
export class AppModule {}