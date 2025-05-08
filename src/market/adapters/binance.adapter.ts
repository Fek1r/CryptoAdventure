import { ExchangeAdapter } from './exchange-adapter.interface';
import { ParsedTicker } from './parsed-ticker.interface';
import axios from 'axios';
import ccxt, { binance, Exchange } from 'ccxt';
export class BinanceAdapter implements ExchangeAdapter {

    serega(){
        const exchange = new ccxt.pro.binance ({
            'apiKey': 'MY_API_KEY',
            'secret': 'MY_SECRET',
        });
    }
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
    return JSON.stringify({
      method: 'SUBSCRIBE',
      params: [`${this.formatTicker(ticker)}@ticker`],
      id: Date.now(),
    });
  }

  parseMessage(msg: string, latency: number): ParsedTicker | null {
    const data = JSON.parse(msg);
    if (data.e !== '24hrTicker') return null;

    const parsed: ParsedTicker = {
      ticker: data.s,
      price: parseFloat(data.c),
      timestamp: data.E,
      exchange: this.getName(),
      latency,
    };

    console.log(`[WS] binance parsed:`, parsed);
    return parsed;
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



