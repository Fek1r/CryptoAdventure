
import { Injectable } from '@nestjs/common';
import { CsvService } from '../storage/csv.service';
import { PostgresService } from '../storage/postgres.service';
import { MarketService } from '../market/market.service';

interface ArbitrageWindow {
  startTime: number;
}

@Injectable()
export class ArbitrageManagerService {
  private windows: Map<string, ArbitrageWindow> = new Map();
  private readonly commissionThreshold = 0.01; // 0%

  constructor(
    private readonly market: MarketService,
    private readonly csv: CsvService,
    private readonly db: PostgresService,
  ) {}

  async handleSpread(
    lowerExchange: string,
    higherExchange: string,
    ticker: string,
    lowerPrice: number,
    higherPrice: number,
    lowerLatency: number,
    higherLatency: number,
  ) {
    ticker = ticker.toUpperCase();
    const spread = ((higherPrice - lowerPrice) / lowerPrice) * 100;

    if (spread < this.commissionThreshold) {
      this.windows.delete(ticker);
      return;
    }

    const window = this.windows.get(ticker);

    if (!window) {
      this.windows.set(ticker, { startTime: Date.now() });

      // Можно включить confirmThroughApi, если нужно API-подтверждение
      const confirmed = await this.confirmThroughApi(lowerExchange, higherExchange, ticker);

      const savedWindow = this.windows.get(ticker);
      if (confirmed && savedWindow) {
        const now = Date.now();
        const realDuration = now - savedWindow.startTime;

        console.log(`✅ Confirmed arbitrage ${ticker}: duration ${realDuration} ms`);

        const record = {
          timestamp: new Date(now).toISOString(),
          exchange_with_lower_price: lowerExchange,
          lower_price: lowerPrice,
          lower_latency: lowerLatency,
          exchange_with_higher_price: higherExchange,
          higher_price: higherPrice,
          higher_latency: higherLatency,
          max_price_diff: parseFloat(spread.toFixed(6)),
          duration: realDuration,
          ticker,
        };

        this.csv.saveRecord(record);
        await this.db.saveRecord(record);
      }

      this.windows.delete(ticker);
    }
  }

  private async confirmThroughApi(lowerExchange: string, higherExchange: string, ticker: string): Promise<boolean> {
    try {
      const lowerAdapter = this.market.getAdapterByName(lowerExchange);
      const higherAdapter = this.market.getAdapterByName(higherExchange);

      if (!lowerAdapter || !higherAdapter) return false;

      const [lowerAsk, higherBid] = await Promise.all([
        lowerAdapter.getBestAsk(ticker),
        higherAdapter.getBestBid(ticker),
      ]);

      if (!lowerAsk || !higherBid) return false;

      const apiSpread = ((higherBid - lowerAsk) / lowerAsk) * 100;
      console.log(`📱 API Spread Confirmed: ${ticker} = ${apiSpread.toFixed(6)} %`);

      return apiSpread >= this.commissionThreshold;
    } catch (error: any) {
      console.error('❌ API confirmation error:', error.message);
      return false;
    }
  }
}
