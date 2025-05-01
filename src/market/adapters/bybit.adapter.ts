// src/market/adapters/bybit.adapter.ts
import { ExchangeAdapter } from './exchange-adapter.interface';
import { ParsedTicker } from './parsed-ticker.interface';
import axios from 'axios';

export class BybitAdapter implements ExchangeAdapter {
  getName(): string {
    return 'bybit';
  }

  formatTicker(ticker: string): string {
    return ticker.toUpperCase(); // Bybit uses uppercase format
  }

  getWebSocketUrl(): string {
    return 'wss://stream.bybit.com/v5/public/linear';
  }

  getSubscribeMessage(ticker: string): string {
    return JSON.stringify({
      op: 'subscribe',
      args: [`tickers.${this.formatTicker(ticker)}`],
    });
  }

  parseMessage(msg: string, latency: number): ParsedTicker | null {
    const data = JSON.parse(msg);
    if (data.topic?.startsWith('tickers.') && data.data) {
      return {
        ticker: data.data.symbol,
        price: parseFloat(data.data.lastPrice),
        timestamp: Date.now(),
        exchange: this.getName(),
        latency,
      };
    }
    return null;
  }

  async getBestBid(ticker: string): Promise<number | null> {
    try {
      const symbol = this.formatTicker(ticker);
      const { data } = await axios.get('https://api.bybit.com/v5/market/orderbook', {
        params: { category: 'linear', symbol, limit: 5 },
      });
      if (!data.result?.b?.length) throw new Error('Bybit empty orderbook');
      return parseFloat(data.result.b[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best bid from Bybit:`, error.message);
      return null;
    }
  }

  async getBestAsk(ticker: string): Promise<number | null> {
    try {
      const symbol = this.formatTicker(ticker);
      const { data } = await axios.get('https://api.bybit.com/v5/market/orderbook', {
        params: { category: 'linear', symbol, limit: 5 },
      });
      if (!data.result?.a?.length) throw new Error('Bybit empty orderbook');
      return parseFloat(data.result.a[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best ask from Bybit:`, error.message);
      return null;
    }
  }
}
