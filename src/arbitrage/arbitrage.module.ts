import { Module } from '@nestjs/common';
import { ArbitrageService } from './arbitrage.service';
import { MarketModule } from '../market/market.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [MarketModule, StorageModule],
  providers: [ArbitrageService],
})
export class ArbitrageModule {}