// src/market/adapters/binance.adapter.ts
import { ExchangeAdapter } from './exchange-adapter.interface';
import axios from 'axios';

export class BinanceAdapter implements ExchangeAdapter {
  getName(): string {
    return 'binance';
  }

  formatTicker(ticker: string): string {
    return ticker.toLowerCase();
  }

  getWebSocketUrl(): string {
    return 'wss://stream.binance.com:9443/ws';
  }

  getSubscribeMessage(ticker: string): string {
    return `${this.formatTicker(ticker)}@ticker`;
  }

  parseMessage(msg: string, latency: number): ParsedTicker | null {
    const data = JSON.parse(msg);
    if (data.e !== '24hrTicker') return null;

    return {
      ticker: data.s,
      price: parseFloat(data.c),
      timestamp: data.E,
      exchange: this.getName(),
      latency,
    };
  }

  async getBestBid(ticker: string): Promise<number | null> {
    try {
      const { data } = await axios.get('https://fapi.binance.com/fapi/v1/depth', {
        params: { symbol: this.formatTicker(ticker), limit: 5 },
      });
      if (!data.bids?.length) throw new Error('Binance Futures empty orderbook');
      return parseFloat(data.bids[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best bid from Binance Futures:`, error.message);
      return null;
    }
  }
  
  async getBestAsk(ticker: string): Promise<number | null> {
    try {
      const { data } = await axios.get('https://fapi.binance.com/fapi/v1/depth', {
        params: { symbol: this.formatTicker(ticker), limit: 5 },
      });
      if (!data.asks?.length) throw new Error('Binance Futures empty orderbook');
      return parseFloat(data.asks[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best ask from Binance Futures:`, error.message);
      return null;
    }
  }
}
