import { Injectable } from '@nestjs/common';
import { CsvService } from '../storage/csv.service';
import { PostgresService } from '../storage/postgres.service';

interface PriceInfo {
  exchange: string;
  price: number;
  latency: number;
  timestamp: number;
  ticker: string;
}

@Injectable()
export class TickerAnalyzerService {
  private latestPrices: Record<string, PriceInfo[]> = {};

  constructor(
    private readonly csv: CsvService,
    private readonly db: PostgresService
  ) {}

  collectPrice(priceInfo: PriceInfo) {
    const key = priceInfo.ticker.toUpperCase();
    if (!this.latestPrices[key]) {
      this.latestPrices[key] = [];
    }

    // Обновляем или добавляем цену от этой биржи
    const existingIndex = this.latestPrices[key].findIndex(
      (p) => p.exchange === priceInfo.exchange
    );

    if (existingIndex !== -1) {
      this.latestPrices[key][existingIndex] = priceInfo;
    } else {
      this.latestPrices[key].push(priceInfo);
    }

    const exchanges = new Set(this.latestPrices[key].map((p) => p.exchange));

    

    if (exchanges.size >= 2) {
      const record = this.analyze(this.latestPrices[key]);

      if (record) {
        console.log('✅ Arbitrage opportunity:', record);

        this.csv.saveRecord(record);

        if (
          record.max_price_diff > 0.1 &&
          record.exchange_with_lower_price !== record.exchange_with_higher_price
        ) {
          this.db.saveRecord(record);
        }
      } else {
        console.log(`ℹ️ No arbitrage found for ${key}`);
      }

      // очищаем
      this.latestPrices[key] = [];
    }
  }

  analyze(prices: PriceInfo[]) {
    const validPrices = prices.filter(
      (p) =>
        typeof p.price === 'number' &&
        typeof p.latency === 'number' &&
        typeof p.timestamp === 'number' &&
        !isNaN(p.price) &&
        !isNaN(p.latency) &&
        !isNaN(p.timestamp)
    );

    if (validPrices.length < 2) return null;

    const sorted = [...validPrices].sort((a, b) => a.price - b.price);
    const [lower, higher] = [sorted[0], sorted[sorted.length - 1]];
    const diffPercent = ((higher.price - lower.price) / lower.price) * 100;

    return {
      timestamp: new Date(higher.timestamp).toISOString(),

      exchange_with_lower_price: lower.exchange,
      lower_price: lower.price,
      lower_latency: lower.latency,

      exchange_with_higher_price: higher.exchange,
      higher_price: higher.price,
      higher_latency: higher.latency,

      max_price_diff: parseFloat(diffPercent.toFixed(6)),
      duration: higher.timestamp - lower.timestamp,

      ticker: lower.ticker.replace('-', '/').toUpperCase(),
      
    };
  }
}
