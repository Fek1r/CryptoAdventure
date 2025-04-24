import { Module } from '@nestjs/common';
import { MarketWebsocketService } from './market-websocket.service';
import { TickerAnalyzerService } from './ticker-analyzer.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [MarketWebsocketService, TickerAnalyzerService],
})
export class MarketDataModule {}