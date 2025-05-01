import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MarketApiService {
  async getBestAsk(exchange: string, ticker: string): Promise<number | null> {
    try {
      switch (exchange.toLowerCase()) {
        case 'binance': {
          const { data } = await axios.get('https://api.binance.com/api/v3/depth', {
            params: { symbol: ticker.replace('/', ''), limit: 5 },
          });
          if (!data.asks?.length) throw new Error('Binance empty orderbook');
          return parseFloat(data.asks[0][0]);
        }
        case 'bybit': {
          const { data } = await axios.get('https://api.bybit.com/v5/market/orderbook', {
            params: { category: 'spot', symbol: ticker.replace('/', '') },
          });
          if (!data.result?.a?.length) throw new Error('Bybit empty orderbook');
          return parseFloat(data.result.a[0][0]);
        }
        case 'okx': {
          const { data } = await axios.get('https://www.okx.com/api/v5/market/books', {
            params: { instId: ticker.replace('/', '-') },
          });
          if (!data.data?.length || !data.data[0].asks?.length) throw new Error('OKX empty orderbook');
          return parseFloat(data.data[0].asks[0][0]);
        }
        case 'gate': {
          const { data } = await axios.get(`https://api.gate.io/api/v4/spot/order_book`, {
            params: { currency_pair: ticker.replace('/', '_'), limit: 1 },
          });
          if (!data.asks?.length) throw new Error('Gate empty orderbook');
          return parseFloat(data.asks[0][0]);
        }
        case 'mexc': {
          const { data } = await axios.get('https://api.mexc.com/api/v3/depth', {
            params: { symbol: ticker.replace('/', ''), limit: 5 },
          });
          if (!data.asks?.length) throw new Error('MEXC empty orderbook');
          return parseFloat(data.asks[0][0]);
        }
        case 'bitget': {
          const { data } = await axios.get('https://api.bitget.com/api/spot/v1/market/depth', {
            params: { symbol: ticker.replace('/', ''), limit: 5 },
          });
          if (!data.data?.asks?.length) throw new Error('Bitget empty orderbook');
          return parseFloat(data.data.asks[0][0]);
        }
        default:
          throw new Error(`Unknown exchange: ${exchange}`);
      }
    } catch (error: any) {
      console.error(`❌ Error fetching best ask from ${exchange}:`, error.message);
      return null;
    }
  }

  async getBestBid(exchange: string, ticker: string): Promise<number | null> {
    try {
      switch (exchange.toLowerCase()) {
        case 'binance': {
          const { data } = await axios.get('https://api.binance.com/api/v3/depth', {
            params: { symbol: ticker.replace('/', ''), limit: 5 },
          });
          if (!data.bids?.length) throw new Error('Binance empty orderbook');
          return parseFloat(data.bids[0][0]);
        }
        case 'bybit': {
          const { data } = await axios.get('https://api.bybit.com/v5/market/orderbook', {
            params: { category: 'spot', symbol: ticker.replace('/', '') },
          });
          if (!data.result?.b?.length) throw new Error('Bybit empty orderbook');
          return parseFloat(data.result.b[0][0]);
        }
        case 'okx': {
          const { data } = await axios.get('https://www.okx.com/api/v5/market/books', {
            params: { instId: ticker.replace('/', '-') },
          });
          if (!data.data?.length || !data.data[0].bids?.length) throw new Error('OKX empty orderbook');
          return parseFloat(data.data[0].bids[0][0]);
        }
        case 'gate': {
          const { data } = await axios.get(`https://api.gate.io/api/v4/spot/order_book`, {
            params: { currency_pair: ticker.replace('/', '_'), limit: 1 },
          });
          if (!data.bids?.length) throw new Error('Gate empty orderbook');
          return parseFloat(data.bids[0][0]);
        }
        case 'mexc': {
          const { data } = await axios.get('https://api.mexc.com/api/v3/depth', {
            params: { symbol: ticker.replace('/', ''), limit: 5 },
          });
          if (!data.bids?.length) throw new Error('MEXC empty orderbook');
          return parseFloat(data.bids[0][0]);
        }
        case 'bitget': {
          const { data } = await axios.get('https://api.bitget.com/api/spot/v1/market/depth', {
            params: { symbol: ticker.replace('/', ''), limit: 5 },
          });
          if (!data.data?.bids?.length) throw new Error('Bitget empty orderbook');
          return parseFloat(data.data.bids[0][0]);
        }
        default:
          throw new Error(`Unknown exchange: ${exchange}`);
      }
    } catch (error: any) {
      console.error(`❌ Error fetching best bid from ${exchange}:`, error.message);
      return null;
    }
  }
}