// src/market/adapters/okx.adapter.ts
import { ExchangeAdapter } from './exchange-adapter.interface';
import { ParsedTicker } from './parsed-ticker.interface';
import axios from 'axios';

export class OkxAdapter implements ExchangeAdapter {
  getName(): string {
    return 'okx';
  }

  formatTicker(ticker: string): string {
    // Return early if ticker already appears correctly formatted
    if (/^[A-Z]+-[A-Z]+-SWAP$/i.test(ticker)) {
      return ticker.toUpperCase();
    }
  
    // Parse tickers like TRXUSDT
    const match = ticker.match(/^([A-Z]+)(USDT)$/i);
    if (!match) {
      throw new Error(`Invalid ticker format for OKX: ${ticker}`);
    }
  
    const base = match[1].toUpperCase();
    const quote = match[2].toUpperCase();
    return `${base}-${quote}-SWAP`;
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
    if (data.arg?.channel === 'tickers' && Array.isArray(data.data) && data.data[0]) {
      const item = data.data[0];
      const parsed: ParsedTicker = {
        ticker: item.instId.replace(/-/g, ''),
        price: parseFloat(item.last),
        timestamp: parseInt(item.ts),
        exchange: this.getName(),
        latency,
      };
      console.log(`[WS] okx parsed:`, parsed);
      return parsed;
    }
  
    console.warn('[WS] okx unknown msg:', msg);
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
