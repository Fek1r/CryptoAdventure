// src/market/adapters/mexc.adapter.ts
import { ExchangeAdapter } from './exchange-adapter.interface';
import { ParsedTicker } from './parsed-ticker.interface';
import axios from 'axios';

export class MexcAdapter implements ExchangeAdapter {
  getName(): string {
    return 'mexc';
  }

  formatTicker(ticker: string): string {
    // Пример: BTCUSDT → BTC_USDT
    return ticker.replace('USDT', '_USDT').toUpperCase();
  }

  getWebSocketUrl(): string {
    return 'wss://contract.mexc.com/ws';
  }

  getSubscribeMessage(ticker: string): string {
    return JSON.stringify({
      method: 'sub.ticker',
      params: [this.formatTicker(ticker)],
      id: Date.now(),
    });
  }

  parseMessage(msg: string, latency: number): ParsedTicker | null {
    const data = JSON.parse(msg);
    if (data?.channel !== 'push.ticker' || !data.data) {
      console.warn('[WS] mexc unknown msg:', msg);
      return null;
    }
  
    const parsed: ParsedTicker = {
      ticker: data.data.symbol.replace('_', ''),
      price: parseFloat(data.data.last),
      timestamp: Date.now(),
      exchange: this.getName(),
      latency,
    };
    console.log(`[WS] mexc parsed:`, parsed);
    return parsed;
  }

  async getBestBid(ticker: string): Promise<number | null> {
    try {
      const symbol = this.formatTicker(ticker);
      const { data } = await axios.get(`https://contract.mexc.com/api/v1/contract/depth/${symbol}?limit=5`);
      if (!data?.data?.bids?.length) throw new Error('No bids in orderbook');
      return parseFloat(data.data.bids[0][0]);
    } catch (err: any) {
      console.error(`❌ Error fetching best bid from MEXC:`, err.message);
      return null;
    }
  }

  async getBestAsk(ticker: string): Promise<number | null> {
    try {
      const symbol = this.formatTicker(ticker);
      const { data } = await axios.get(`https://contract.mexc.com/api/v1/contract/depth/${symbol}?limit=5`);
      if (!data?.data?.asks?.length) throw new Error('No asks in orderbook');
      return parseFloat(data.data.asks[0][0]);
    } catch (err: any) {
      console.error(`❌ Error fetching best ask from MEXC:`, err.message);
      return null;
    }
  }
}
