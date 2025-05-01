// src/app.module.ts
import { Module } from '@nestjs/common';
import { MarketModule } from './market/market.module';
import { ArbitrageModule } from './arbitrage/arbitrage.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [MarketModule, ArbitrageModule, StorageModule],
})
export class AppModule {}
