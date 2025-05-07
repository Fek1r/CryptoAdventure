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
  private readonly commissionThreshold = 0.01; // 0.01%

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

      const confirmed = await this.confirmThroughApi(lowerExchange, higherExchange, ticker);

      const savedWindow = this.windows.get(ticker);
      if (confirmed && savedWindow) {
        const now = Date.now();
        const realDuration = now - savedWindow.startTime;

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

        console.log(`✅ Arbitrage recorded: ${ticker} | Spread: ${spread.toFixed(6)}% | Duration: ${realDuration} ms`);
      } else {
        console.log(`❗ Arbitrage not confirmed for ${ticker} (spread: ${spread.toFixed(6)}%)`);
      }

      this.windows.delete(ticker);
    }

    // 🔄 На будущее: тут можно расширить окно по всем биржам и тикерам
  }

  private async confirmThroughApi(lowerExchange: string, higherExchange: string, ticker: string): Promise<boolean> {
    try {
      const lowerAdapter = this.market.getAdapterByName(lowerExchange);
      const higherAdapter = this.market.getAdapterByName(higherExchange);

      if (!lowerAdapter || !higherAdapter) {
        console.warn(`⚠️ Missing adapter for ${ticker}:`, { lowerExchange, higherExchange });
        return false;
      }

      const [lowerAsk, higherBid] = await Promise.all([
        lowerAdapter.getBestAsk(ticker),
        higherAdapter.getBestBid(ticker),
      ]);

      if (lowerAsk === null || higherBid === null) {
        console.warn(`⚠️ Null bid/ask from API for ${ticker}`, { lowerAsk, higherBid });
        return false;
      }

      const apiSpread = ((higherBid - lowerAsk) / lowerAsk) * 100;
      console.log(`📱 API Spread: ${ticker} = ${apiSpread.toFixed(6)} %`);

      if (apiSpread < this.commissionThreshold) {
        console.log(`❌ Spread too low to confirm arbitrage: ${apiSpread.toFixed(6)}% < ${this.commissionThreshold * 100}%`);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error(`❌ API confirmation error (${ticker}):`, error.message);
      return false;
    }
  }
}
