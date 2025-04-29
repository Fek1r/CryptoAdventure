import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class MarketApiService {
  private readonly keys = {
    binance: {
      apiKey: process.env.BINANCE_API_KEY,
      secretKey: process.env.BINANCE_SECRET_KEY,
    },
    bybit: {
      apiKey: process.env.BYBIT_API_KEY,
      secretKey: process.env.BYBIT_SECRET_KEY,
    },
    okx: {
      apiKey: process.env.OKX_API_KEY,
      secretKey: process.env.OKX_SECRET_KEY,
      passphrase: process.env.OKX_PASSPHRASE,
    },
    gate: {
      apiKey: process.env.GATE_API_KEY,
      secretKey: process.env.GATE_SECRET_KEY,
    },
    mexc: {
      apiKey: process.env.MEXC_API_KEY,
      secretKey: process.env.MEXC_SECRET_KEY,
    },
    bitget: {
      apiKey: process.env.BITGET_API_KEY,
      secretKey: process.env.BITGET_SECRET_KEY,
      passphrase: process.env.BITGET_PASSPHRASE,
    },
  };

  private ensureKeysDefined(exchange: string, requiredKeys: string[], keysObj: Record<string, any>) {
    for (const key of requiredKeys) {
      if (!keysObj[key]) {
        throw new Error(`❌ ${exchange.toUpperCase()}: Missing ${key} in environment variables`);
      }
    }
  }
  async getBestAsk(exchange: string, ticker: string): Promise<number | null> {
    try {
      const urlParams = { symbol: ticker.replace('/', ''), limit: 5 };
      switch (exchange.toLowerCase()) {
        case 'binance': {
          const { data } = await axios.get('https://api.binance.com/api/v3/depth', { params: urlParams });
          return data.asks?.length ? parseFloat(data.asks[0][0]) : null;
        }
        case 'bybit': {
          const { data } = await axios.get('https://api.bybit.com/v5/market/orderbook', {
            params: { category: 'spot', symbol: ticker.replace('/', '') },
          });
          return data.result?.a?.length ? parseFloat(data.result.a[0][0]) : null;
        }
        case 'okx': {
          const { data } = await axios.get('https://www.okx.com/api/v5/market/books', {
            params: { instId: ticker.replace('/', '-') },
          });
          return data.data?.[0]?.asks?.length ? parseFloat(data.data[0].asks[0][0]) : null;
        }
        case 'gate': {
          const { data } = await axios.get('https://api.gate.io/api/v4/spot/order_book', {
            params: { currency_pair: ticker.replace('/', '_'), limit: 1 },
          });
          return data.asks?.length ? parseFloat(data.asks[0][0]) : null;
        }
        case 'mexc': {
          const { data } = await axios.get('https://api.mexc.com/api/v3/depth', {
            params: urlParams,
          });
          return data.asks?.length ? parseFloat(data.asks[0][0]) : null;
        }
        case 'bitget': {
          const { data } = await axios.get('https://api.bitget.com/api/spot/v1/market/depth', {
            params: urlParams,
          });
          return data.data?.asks?.length ? parseFloat(data.data.asks[0][0]) : null;
        }
        default:
          return null;
      }
    } catch (e) {
      console.error(`❌ getBestAsk error for ${exchange}:`, e.message);
      return null;
    }
  }

  async getBestBid(exchange: string, ticker: string): Promise<number | null> {
    try {
      const urlParams = { symbol: ticker.replace('/', ''), limit: 5 };
      switch (exchange.toLowerCase()) {
        case 'binance': {
          const { data } = await axios.get('https://api.binance.com/api/v3/depth', { params: urlParams });
          return data.bids?.length ? parseFloat(data.bids[0][0]) : null;
        }
        case 'bybit': {
          const { data } = await axios.get('https://api.bybit.com/v5/market/orderbook', {
            params: { category: 'spot', symbol: ticker.replace('/', '') },
          });
          return data.result?.b?.length ? parseFloat(data.result.b[0][0]) : null;
        }
        case 'okx': {
          const { data } = await axios.get('https://www.okx.com/api/v5/market/books', {
            params: { instId: ticker.replace('/', '-') },
          });
          return data.data?.[0]?.bids?.length ? parseFloat(data.data[0].bids[0][0]) : null;
        }
        case 'gate': {
          const { data } = await axios.get('https://api.gate.io/api/v4/spot/order_book', {
            params: { currency_pair: ticker.replace('/', '_'), limit: 1 },
          });
          return data.bids?.length ? parseFloat(data.bids[0][0]) : null;
        }
        case 'mexc': {
          const { data } = await axios.get('https://api.mexc.com/api/v3/depth', {
            params: urlParams,
          });
          return data.bids?.length ? parseFloat(data.bids[0][0]) : null;
        }
        case 'bitget': {
          const { data } = await axios.get('https://api.bitget.com/api/spot/v1/market/depth', {
            params: urlParams,
          });
          return data.data?.bids?.length ? parseFloat(data.data.bids[0][0]) : null;
        }
        default:
          return null;
      }
    } catch (e) {
      console.error(`❌ getBestBid error for ${exchange}:`, e.message);
      return null;
    }
  }

  async placeOrderAndMeasureLatency(
    exchange: string,
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price?: number,
  ): Promise<number | null> {
    try {
      const ex = exchange.toLowerCase();
      switch (ex) {
        case 'binance': return await this.binanceOrder(symbol, side, quantity, price);
        case 'bybit': return await this.bybitOrder(symbol, side, quantity, price);
        case 'okx': return await this.okxOrder(symbol, side, quantity, price);
        case 'gate': return await this.gateOrder(symbol, side, quantity);
        case 'mexc': return await this.mexcOrder(symbol, side, quantity);
        case 'bitget': return await this.bitgetOrder(symbol, side, quantity);
        default: throw new Error(`Exchange not supported: ${exchange}`);
      }
    } catch (error: any) {
      console.error(`❌ Order failed on ${exchange}:`, error.message);
      return null;
    }
  }

  private async binanceOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number, price?: number) {
    const keys = this.keys.binance;
    this.ensureKeysDefined('binance', ['apiKey', 'secretKey'], keys);
    const { apiKey, secretKey } = keys;

    const endpoint = 'https://api.binance.com/api/v3/order';
    const timestamp = Date.now();
    const type = price ? 'LIMIT' : 'MARKET';
    const query = `symbol=${symbol}&side=${side}&type=${type}${price ? '&timeInForce=GTC&price=' + price : ''}&quantity=${quantity}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', secretKey).update(query).digest('hex');
    const url = `${endpoint}?${query}&signature=${signature}`;

    const headers = { 'X-MBX-APIKEY': apiKey };
    const start = Date.now();
    await axios.post(url, null, { headers });
    return Date.now() - start;
  }

  private async bybitOrder(symbol: string, side: 'BUY' | 'SELL', qty: number, price?: number) {
    const keys = this.keys.bybit;
    this.ensureKeysDefined('bybit', ['apiKey', 'secretKey'], keys);
    const { apiKey, secretKey } = keys;

    const endpoint = 'https://api.bybit.com/v5/order/create';
    const timestamp = Date.now().toString();
    const body = {
      category: 'spot',
      symbol,
      side,
      orderType: price ? 'Limit' : 'Market',
      qty: qty.toString(),
      ...(price && { price: price.toString(), timeInForce: 'GTC' }),
    };
    const signPayload = timestamp + apiKey + JSON.stringify(body);
    const sign = crypto.createHmac('sha256', secretKey).update(signPayload).digest('hex');

    const headers = {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-SIGN': sign,
      'Content-Type': 'application/json',
    };

    const start = Date.now();
    await axios.post(endpoint, body, { headers });
    return Date.now() - start;
  }

  private async okxOrder(symbol: string, side: 'BUY' | 'SELL', size: number, price?: number) {
    const keys = this.keys.okx;
    this.ensureKeysDefined('okx', ['apiKey', 'secretKey', 'passphrase'], keys);
    const { apiKey, secretKey, passphrase } = keys;

    const endpoint = 'https://www.okx.com/api/v5/trade/order';
    const timestamp = new Date().toISOString();
    const body = {
      instId: symbol.replace('/', '-'),
      tdMode: 'cash',
      side: side.toLowerCase(),
      ordType: price ? 'limit' : 'market',
      sz: size.toString(),
      ...(price && { px: price.toString() }),
    };
    const prehash = `${timestamp}POST/api/v5/trade/order${JSON.stringify(body)}`;
    const sign = crypto.createHmac('sha256', secretKey).update(prehash).digest('base64');

    const headers = {
      'OK-ACCESS-KEY': apiKey,
      'OK-ACCESS-SIGN': sign,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': passphrase,
      'Content-Type': 'application/json',
    };

    const start = Date.now();
    await axios.post(endpoint, body, { headers });
    return Date.now() - start;
  }

  private async gateOrder(symbol: string, side: 'BUY' | 'SELL', amount: number) {
    const keys = this.keys.gate;
    this.ensureKeysDefined('gate', ['apiKey', 'secretKey'], keys);
    const { apiKey, secretKey } = keys;

    const endpoint = 'https://api.gate.io/api/v4/spot/orders';
    const body = {
      currency_pair: symbol.replace('/', '_'),
      type: 'market',
      side: side.toLowerCase(),
      amount: amount.toString(),
    };
    const payload = JSON.stringify(body);
    const sign = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');

    const headers = {
      KEY: apiKey,
      SIGN: sign,
      'Content-Type': 'application/json',
    };

    const start = Date.now();
    await axios.post(endpoint, body, { headers });
    return Date.now() - start;
  }

  private async mexcOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number) {
    const keys = this.keys.mexc;
    this.ensureKeysDefined('mexc', ['apiKey', 'secretKey'], keys);
    const { apiKey, secretKey } = keys;

    const endpoint = 'https://api.mexc.com/api/v3/order';
    const timestamp = Date.now();
    const params = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}`;
    const sign = crypto.createHmac('sha256', secretKey).update(params).digest('hex');
    const url = `${endpoint}?${params}&signature=${sign}`;
    const headers = { 'X-MEXC-APIKEY': apiKey };

    const start = Date.now();
    await axios.post(url, null, { headers });
    return Date.now() - start;
  }

  private async bitgetOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number) {
    const keys = this.keys.bitget;
    this.ensureKeysDefined('bitget', ['apiKey', 'secretKey', 'passphrase'], keys);
    const { apiKey, secretKey, passphrase } = keys;

    const endpoint = 'https://api.bitget.com/api/spot/v1/trade/orders';
    const timestamp = Date.now().toString();
    const body = {
      symbol,
      side: side.toLowerCase(),
      orderType: 'market',
      quantity: quantity.toString(),
    };
    const prehash = timestamp + 'POST' + '/api/spot/v1/trade/orders' + JSON.stringify(body);
    const sign = crypto.createHmac('sha256', secretKey).update(prehash).digest('base64');

    const headers = {
      'ACCESS-KEY': apiKey,
      'ACCESS-SIGN': sign,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': passphrase,
      'Content-Type': 'application/json',
    };

    const start = Date.now();
    await axios.post(endpoint, body, { headers });
    return Date.now() - start;
  }
}
