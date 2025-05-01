import { ExchangeAdapter } from './exchange-adapter.interface';
import { ParsedTicker } from './parsed-ticker.interface';
import axios from 'axios';

export class MexcAdapter implements ExchangeAdapter {
  getName(): string {
    return 'mexc';
  }

  formatTicker(ticker: string): string {
    return ticker.toUpperCase(); // MEXC Futures используют BTCUSDT
  }

  getWebSocketUrl(): string {
    return 'wss://contract.mexc.com/ws';
  }

  getSubscribeMessage(ticker: string): string {
    return JSON.stringify({
      method: 'sub.deal',
      param: { symbol: this.formatTicker(ticker) },
      id: Date.now(),
    });
  }

  parseMessage(msg: string, latency: number): ParsedTicker | null {
    const data = JSON.parse(msg);
    if (data?.channel === 'push.deal' && data?.data?.[0]) {
      const trade = data.data[0];
      return {
        ticker: trade.symbol,
        price: parseFloat(trade.price),
        timestamp: Date.now(),
        exchange: this.getName(),
        latency,
      };
    }
    return null;
  }

  async getBestBid(ticker: string): Promise<number | null> {
    try {
      const { data } = await axios.get(`https://contract.mexc.com/api/v1/contract/depth/${this.formatTicker(ticker)}?limit=5`);
      if (!data.data?.bids?.length) throw new Error('MEXC Futures empty orderbook');
      return parseFloat(data.data.bids[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best bid from MEXC:`, error.message);
      return null;
    }
  }

  async getBestAsk(ticker: string): Promise<number | null> {
    try {
      const { data } = await axios.get(`https://contract.mexc.com/api/v1/contract/depth/${this.formatTicker(ticker)}?limit=5`);
      if (!data.data?.asks?.length) throw new Error('MEXC Futures empty orderbook');
      return parseFloat(data.data.asks[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best ask from MEXC:`, error.message);
      return null;
    }
  }
}