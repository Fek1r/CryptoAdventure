import { forwardRef, Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketWebsocketService } from './market-websocket.service';
import { TickerAnalyzerService } from './ticker-analyzer.service';
import { ArbitrageModule } from '../arbitrage/arbitrage.module';

@Module({
  imports: [forwardRef(() => ArbitrageModule)],
  providers: [
    MarketService,
    MarketWebsocketService,
    TickerAnalyzerService,
  ],
  exports: [MarketService],
})
export class MarketModule {}
