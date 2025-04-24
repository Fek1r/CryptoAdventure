import { Injectable } from '@nestjs/common';
import { CsvService } from '../storage/csv.service';
import { PostgresService } from '../storage/postgres.service';

interface PriceInfo {
  exchange: string;
  price: number;
  latency: number;
  timestamp: number;
}

@Injectable()
export class TickerAnalyzerService {
  private latestPrices: Record<string, PriceInfo[]> = {};

  constructor(
    private readonly csv: CsvService,
    private readonly db: PostgresService
  ) {}

  collectPrice(priceInfo: PriceInfo) {
    const key = 'ltcusdt';
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
      timestamp: new Date(higher.timestamp).toISOString(), // <- теперь это валидный timestamp
      exchange_with_lower_price: lower.exchange,
      exchange_with_lower_price_api_response_time: lower.latency,
      exchange_with_higher_price: higher.exchange,
      exchange_with_higher_price_api_response_time: higher.latency,
      max_price_diff: diff,
      total_price_diff_duration: higher.timestamp - lower.timestamp,
      ticker: 'LTC/USDT',
    };
  }
  
}