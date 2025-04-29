import { Injectable } from '@nestjs/common';
import { MarketApiService } from './market-api.service';
import { CsvService } from '../storage/csv.service';
import { PostgresService } from '../storage/postgres.service';

interface ArbitrageWindow {
  startTime: number;
}

@Injectable()
export class ArbitrageManagerService {
  private windows: Map<string, ArbitrageWindow> = new Map();
  private readonly commissionThreshold = 0.01; // 0%

  constructor(
    private readonly api: MarketApiService,
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
      console.log(`❌ Spread too small for ${ticker}: ${spread.toFixed(6)}%`);
      return;
    }

    const window = this.windows.get(ticker);

    if (!window) {
      this.windows.set(ticker, { startTime: Date.now() });
      console.log(`⏳ New arbitrage window started for ${ticker}`);

      // ВРЕМЕННО: подтверждение отключено
      const confirmed = true;

      // Если хочешь вернуть API-подтверждение — раскомментируй:
      // const confirmed = await this.confirmThroughApi(lowerExchange, higherExchange, ticker);

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

        console.log('📤 Writing to CSV & DB:', record);

        try {
          this.csv.saveRecord(record);
        } catch (err) {
          console.error('❌ CSV save error:', err.message);
        }

        try {
          await this.db.saveRecord(record);
        } catch (err) {
          console.error('❌ DB save error:', err.message);
        }
      } else {
        console.log(`⚠️ Arbitrage not confirmed for ${ticker}`);
      }

      this.windows.delete(ticker);
    }
  }

  private async confirmThroughApi(lowerExchange: string, higherExchange: string, ticker: string): Promise<boolean> {
    try {
      const [lowerAsk, higherBid] = await Promise.all([
        this.api.getBestAsk(lowerExchange, ticker),
        this.api.getBestBid(higherExchange, ticker),
      ]);

      if (!lowerAsk || !higherBid) {
        console.warn(`⚠️ API data missing for ${ticker}: ask=${lowerAsk}, bid=${higherBid}`);
        return false;
      }

      const apiSpread = ((higherBid - lowerAsk) / lowerAsk) * 100;
      console.log(`📱 API Spread: ${ticker} = ${apiSpread.toFixed(6)}%`);

      return apiSpread >= this.commissionThreshold;
    } catch (error: any) {
      console.error('❌ API confirmation error:', error.message);
      return false;
    }
  }
}
