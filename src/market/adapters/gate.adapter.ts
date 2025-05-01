// src/market/adapters/gate.adapter.ts
import { ExchangeAdapter } from './exchange-adapter.interface';
import axios from 'axios';

export class GateAdapter implements ExchangeAdapter {
  getName(): string {
    return 'gate';
  }

  formatTicker(ticker: string): string {
    // Пример: BTCUSDT → BTC_USDT
    return ticker.replace('USDT', '_USDT').toUpperCase();
  }

  getWebSocketUrl(): string {
    // WebSocket для фьючерсов USDT (Perpetual)
    return 'wss://fx-ws.gate.io/v4/ws/usdt';
  }

  getSubscribeMessage(ticker: string): string {
    return JSON.stringify({
      time: Date.now(),
      channel: 'futures.tickers',
      event: 'subscribe',
      payload: [this.formatTicker(ticker)],
    });
  }

  parseMessage(msg: string, latency: number): ParsedTicker | null {
    const data = JSON.parse(msg);
    if (data.channel === 'futures.tickers' && data.result) {
      return {
        ticker: data.result.contract.replace('_', ''),
        price: parseFloat(data.result.last),
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
      const { data } = await axios.get(`https://api.gate.io/api/v4/futures/usdt/order_book`, {
        params: { contract: symbol, limit: 5 },
      });
      if (!data.bids?.length) throw new Error('Gate.io Futures empty orderbook');
      return parseFloat(data.bids[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best bid from Gate.io:`, error.message);
      return null;
    }
  }

  async getBestAsk(ticker: string): Promise<number | null> {
    try {
      const symbol = this.formatTicker(ticker);
      const { data } = await axios.get(`https://api.gate.io/api/v4/futures/usdt/order_book`, {
        params: { contract: symbol, limit: 5 },
      });
      if (!data.asks?.length) throw new Error('Gate.io Futures empty orderbook');
      return parseFloat(data.asks[0][0]);
    } catch (error: any) {
      console.error(`❌ Error fetching best ask from Gate.io:`, error.message);
      return null;
    }
  }
}
