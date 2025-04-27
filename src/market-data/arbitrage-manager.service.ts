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

  async handleSpread(lowerExchange: string, higherExchange: string, ticker: string, lowerPrice: number, higherPrice: number) {
    ticker = ticker.toUpperCase();
    const spread = ((higherPrice - lowerPrice) / lowerPrice) * 100;

    if (spread < this.commissionThreshold) {
      // Спред меньше комиссии — сбрасываем окно
      this.windows.delete(ticker);
      return;
    }

    if (!this.windows.has(ticker)) {
      // Создаем окно
      this.windows.set(ticker, { startTime: Date.now() });

      // Проверяем через API стаканы
      const confirmed = await this.confirmThroughApi(lowerExchange, higherExchange, ticker);

      if (confirmed) {
        const now = Date.now();
        const realDuration = now - this.windows.get(ticker)!.startTime;

        console.log(`✅ Confirmed arbitrage ${ticker}: duration ${realDuration} ms`);

        const record = {
            timestamp: new Date(now).toISOString(),
            exchange_with_lower_price: lowerExchange,
            lower_price: lowerPrice,
            lower_latency: 0,
            exchange_with_higher_price: higherExchange,
            higher_price: higherPrice,
            higher_latency: 0,
            max_price_diff: parseFloat(spread.toFixed(6)), // важно
            duration: realDuration, // нужно обязательно поле duration!
            ticker,
          };

        this.csv.saveRecord(record);
        await this.db.saveRecord(record);
      }

      // После проверки в любом случае удаляем окно
      this.windows.delete(ticker);
    }
  }

  private async confirmThroughApi(lowerExchange: string, higherExchange: string, ticker: string): Promise<boolean> {
    try {
      const [lowerAsk, higherBid] = await Promise.all([
        this.api.getBestAsk(lowerExchange, ticker),
        this.api.getBestBid(higherExchange, ticker),
      ]);

      if (!lowerAsk || !higherBid) return false;

      const apiSpread = ((higherBid - lowerAsk) / lowerAsk) * 100;
      console.log(`📡 API Spread Confirmed: ${ticker} = ${apiSpread.toFixed(6)} %`);

      return apiSpread >= this.commissionThreshold;
    } catch (error: any) {
      console.error('❌ API confirmation error:', error.message);
      return false;
    }
  }
}
