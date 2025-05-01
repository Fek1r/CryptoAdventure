import { Module } from '@nestjs/common';
import { MarketWebsocketService } from './market-websocket.service';
import { TickerAnalyzerService } from './ticker-analyzer.service';
import { ArbitrageManagerService } from '../arbitrage/arbitrage.service';
import { MarketApiService } from './market-api.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [
    MarketWebsocketService,
    TickerAnalyzerService,
    ArbitrageManagerService,
    MarketApiService,
  ],
})
export class MarketDataModule {}
