// src/market/adapters/bitget.adapter.ts
import { ExchangeAdapter } from './exchange-adapter.interface';
import { ParsedTicker } from './parsed-ticker.interface';
import axios from 'axios';

export class BitgetAdapter implements ExchangeAdapter {
  getName(): string {
    return 'bitget';
  }

  formatTicker(ticker: string): string {
    return `${ticker.toUpperCase()}_UMCBL`; // Пример: BTCUSDT_UMCBL
  }

  getWebSocketUrl(): string {
    return 'wss://ws.bitget.com/mix/v1/stream';
  }

  getSubscribeMessage(ticker: string): string {
    return JSON.stringify({
      op: 'subscribe',
      args: [{
        instType: 'UMCBL',
        channel: 'ticker',
        instId: this.formatTicker(ticker),
      }],
    });
  }

  parseMessage(msg: string, latency: number): ParsedTicker | null {
    const data = JSON.parse(msg);
    if (data.arg?.channel === 'ticker' && data.data?.[0]) {
      return {
        ticker: data.arg.instId.replace('_UMCBL', ''),
        price: parseFloat(data.data[0].last),
        timestamp: parseInt(data.data[0].ts),
        exchange: this.getName(),
        latency,
      };
    }
    return null;
  }

  async getBestBid(ticker: string): Promise<number | null> {
    try {
      const { data } = await axios.get(`https://api.bitget.com/api/mix/v1/market/depth`, {
        params: { symbol: this.formatTicker(ticker), limit: 5 },
      });
      if (!data.data?.bids?.length) throw new Error('Bitget Futures empty orderbook');
      return parseFloat(data.data.bids[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best bid from Bitget:`, error.message);
      return null;
    }
  }

  async getBestAsk(ticker: string): Promise<number | null> {
    try {
      const { data } = await axios.get(`https://api.bitget.com/api/mix/v1/market/depth`, {
        params: { symbol: this.formatTicker(ticker), limit: 5 },
      });
      if (!data.data?.asks?.length) throw new Error('Bitget Futures empty orderbook');
      return parseFloat(data.data.asks[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best ask from Bitget:`, error.message);
      return null;
    }
  }
}
