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
    const key = priceInfo.ticker;
    if (!this.latestPrices[key]) this.latestPrices[key] = [];

    this.latestPrices[key].push(priceInfo);

    if (this.latestPrices[key].length >= 3) {
      const record = this.analyze(this.latestPrices[key]);
      this.csv.saveRecord(record);
      this.db.saveRecord(record);
      this.latestPrices[key] = [];
    }
  }

  analyze(prices: PriceInfo[]) {
    const sorted = prices.sort((a, b) => a.price - b.price);
    const [lower, higher] = [sorted[0], sorted[sorted.length - 1]];
    const diff = ((higher.price - lower.price) / lower.price) * 100;

    return {
      timestamp: new Date(higher.timestamp).toISOString(),
      exchange_with_lower_price: lower.exchange,
      exchange_with_lower_price_api_response_time: lower.latency,
      price_with_lower_exchange: lower.price,

      exchange_with_higher_price: higher.exchange,
      exchange_with_higher_price_api_response_time: higher.latency,
      price_with_higher_exchange: higher.price,

      max_price_diff: diff,
      total_price_diff_duration: higher.timestamp - lower.timestamp,
      ticker: prices[0].ticker.replace('-', '/').toUpperCase(),
    };
  }
}
