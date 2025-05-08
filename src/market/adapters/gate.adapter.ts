// src/market/adapters/gate.adapter.ts
import { ExchangeAdapter } from './exchange-adapter.interface';
import { ParsedTicker } from './parsed-ticker.interface';
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
    return 'wss://fx-ws.gateio.ws/v4/ws/usdt';
  }

  getSubscribeMessage(ticker: string): string {
    return JSON.stringify({
      time: Date.now(),
      channel: 'futures.tickers',
      event: 'subscribe',
      payload: [ticker], // тикер должен быть в формате 'TRX_USDT'
      settle: 'usdt',    // обязательно для фьючерсов
    });
  }

  parseMessage(msg: string, latency: number): ParsedTicker | null {
    const data = JSON.parse(msg);
  
    if (data.event !== 'update' || !Array.isArray(data.result) || !data.result.length) {
      console.warn('[WS] gate unknown msg:', msg);
      return null;
    }
  
    const tickerData = data.result[0];
  
    if (!tickerData.contract || !tickerData.last) {
      console.error('[Gate] Invalid ticker update:', JSON.stringify(data));
      return null;
    }
  
    const parsed: ParsedTicker = {
      ticker: tickerData.contract.replace('_', ''),
      price: parseFloat(tickerData.last),
      timestamp: Date.now(),
      exchange: this.getName(),
      latency,
    };
  
    // console.log(`[WS] gate parsed:`, parsed);
    return parsed;
  }

  async getBestBid(ticker: string): Promise<number | null> {
    try {
      const symbol = this.formatTicker(ticker);
      const { data } = await axios.get(`https://fx-api.gateio.ws/api/v4/futures/usdt/order_book`, {
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
      const { data } = await axios.get(`https://fx-api.gateio.ws/api/v4/futures/usdt/order_book`, {
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
