import { Injectable } from '@nestjs/common';
import { ArbitrageManagerService } from '../arbitrage/arbitrage-manager.service';

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
  private readonly maxLatency = 2000; // ms
  private readonly maxAge = 1000; // ms

  constructor(private readonly arbitrageManager: ArbitrageManagerService) {}

  collectPrice(priceInfo: PriceInfo) {
    const key = priceInfo.ticker.toUpperCase();
    const now = Date.now();

    if (!this.latestPrices[key]) {
      this.latestPrices[key] = [];
    }

    // Убираем старые или медленные записи
    this.latestPrices[key] = this.latestPrices[key].filter(p =>
      now - p.timestamp < this.maxAge && p.latency <= this.maxLatency,
    );

    const existingIndex = this.latestPrices[key].findIndex(p => p.exchange === priceInfo.exchange);

    if (existingIndex !== -1) {
      this.latestPrices[key][existingIndex] = priceInfo;
    } else {
      this.latestPrices[key].push(priceInfo);
    }

    const exchanges = new Set(this.latestPrices[key].map(p => p.exchange));

    if (exchanges.size >= 2) {
      const record = this.analyze(this.latestPrices[key]);

      if (record) {
        console.log('✅ Potential Arbitrage Found:', record);
        this.arbitrageManager.handleSpread(
          record.exchange_with_lower_price,
          record.exchange_with_higher_price,
          record.ticker,
          record.lower_price,
          record.higher_price,
          record.lower_latency,
          record.higher_latency
        );
      } else {
        console.log(`ℹ️ No arbitrage found for ${key}`);
      }

      this.latestPrices[key] = [];
    }
  }

  analyze(prices: PriceInfo[]) {
    const validPrices = prices.filter(p =>
      typeof p.price === 'number' && !isNaN(p.price)
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
      duration: Math.abs(higher.timestamp - lower.timestamp),
      ticker: lower.ticker,
    };
  }
}
