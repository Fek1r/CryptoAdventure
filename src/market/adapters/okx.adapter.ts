// src/market/adapters/okx.adapter.ts
import { ExchangeAdapter } from './exchange-adapter.interface';
import { ParsedTicker } from './parsed-ticker.interface';
import axios from 'axios';

export class OkxAdapter implements ExchangeAdapter {
  getName(): string {
    return 'okx';
  }

  formatTicker(ticker: string): string {
    // OKX Futures symbols: e.g., BTC-USDT-SWAP
    return ticker.replace('USDT', '-USDT-SWAP').toUpperCase();
  }

  getWebSocketUrl(): string {
    return 'wss://ws.okx.com:8443/ws/v5/public';
  }

  getSubscribeMessage(ticker: string): string {
    return JSON.stringify({
      op: 'subscribe',
      args: [
        {
          channel: 'tickers',
          instId: this.formatTicker(ticker),
        },
      ],
    });
  }

  parseMessage(msg: string, latency: number): ParsedTicker | null {
    const data = JSON.parse(msg);
    if (data.arg?.channel === 'tickers' && data.data?.[0]) {
      const item = data.data[0];
      return {
        ticker: item.instId.replace(/-/g, ''),
        price: parseFloat(item.last),
        timestamp: parseInt(item.ts),
        exchange: this.getName(),
        latency,
      };
    }
    return null;
  }

  async getBestBid(ticker: string): Promise<number | null> {
    try {
      const instId = this.formatTicker(ticker);
      const { data } = await axios.get('https://www.okx.com/api/v5/market/books', {
        params: { instId, sz: 5 },
      });
      if (!data.data?.[0]?.bids?.length) throw new Error('OKX empty orderbook');
      return parseFloat(data.data[0].bids[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best bid from OKX:`, error.message);
      return null;
    }
  }

  async getBestAsk(ticker: string): Promise<number | null> {
    try {
      const instId = this.formatTicker(ticker);
      const { data } = await axios.get('https://www.okx.com/api/v5/market/books', {
        params: { instId, sz: 5 },
      });
      if (!data.data?.[0]?.asks?.length) throw new Error('OKX empty orderbook');
      return parseFloat(data.data[0].asks[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best ask from OKX:`, error.message);
      return null;
    }
  }
}
