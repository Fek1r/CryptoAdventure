import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class MarketApiService {
  // 🔐 Вставь свои API ключи (рекомендуется через .env)
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

  // 🔁 Унифицированный метод: отправка рыночного ордера и замер latency
  async placeOrderAndMeasureLatency(
    exchange: string,
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price?: number, // для лимитного ордера
  ): Promise<number | null> {
    try {
      const ex = exchange.toLowerCase();

      switch (ex) {
        case 'binance':
          return await this.binanceOrder(symbol, side, quantity, price);
        case 'bybit':
          return await this.bybitOrder(symbol, side, quantity, price);
        case 'okx':
          return await this.okxOrder(symbol, side, quantity, price);
        case 'gate':
          return await this.gateOrder(symbol, side, quantity);
        case 'mexc':
          return await this.mexcOrder(symbol, side, quantity);
        case 'bitget':
          return await this.bitgetOrder(symbol, side, quantity);
        default:
          throw new Error(`Exchange not supported: ${exchange}`);
      }
    } catch (error: any) {
      console.error(`❌ Order failed on ${exchange}:`, error.message);
      return null;
    }
  }

  // ✅ Binance
  private async binanceOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number, price?: number) {
    const { apiKey, secretKey } = this.keys.binance;
    const endpoint = 'https://api.binance.com/api/v3/order';
    const timestamp = Date.now();
    const type = price ? 'LIMIT' : 'MARKET';
    const timeInForce = price ? '&timeInForce=GTC' : '';
    const priceParam = price ? `&price=${price}` : '';
    const query = `symbol=${symbol}&side=${side}&type=${type}${timeInForce}&quantity=${quantity}${priceParam}&timestamp=${timestamp}`;
    const signature = crypto.createHmac('sha256', secretKey).update(query).digest('hex');
    const url = `${endpoint}?${query}&signature=${signature}`;

    const headers = { 'X-MBX-APIKEY': apiKey };

    const start = Date.now();
    await axios.post(url, null, { headers });
    return Date.now() - start;
  }

  // ✅ Bybit
  private async bybitOrder(symbol: string, side: 'BUY' | 'SELL', qty: number, price?: number) {
    const { apiKey, secretKey } = this.keys.bybit;
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

  // ✅ OKX
  private async okxOrder(symbol: string, side: 'BUY' | 'SELL', size: number, price?: number) {
    const { apiKey, secretKey, passphrase } = this.keys.okx;
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
    const prehash = `${timestamp}${'POST'}${'/api/v5/trade/order'}${JSON.stringify(body)}`;
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

  // ✅ Gate.io
  private async gateOrder(symbol: string, side: 'BUY' | 'SELL', amount: number) {
    const { apiKey, secretKey } = this.keys.gate;
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

  // ✅ MEXC
  private async mexcOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number) {
    const { apiKey, secretKey } = this.keys.mexc;
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

  // ✅ Bitget
  private async bitgetOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number) {
    const { apiKey, secretKey, passphrase } = this.keys.bitget;
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
