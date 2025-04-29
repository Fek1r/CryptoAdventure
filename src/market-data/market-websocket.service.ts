import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';
import { TickerAnalyzerService } from './ticker-analyzer.service';

@Injectable()
export class MarketWebsocketService {
  private readonly tickersPerExchange = {
    binance: [
      'trxusdt', 'adausdt', 'dogeusdt', 'tonusdt', 'nearusdt',
      'xlmusdt', 'algousdt', 'iotausdt', 'icpusdt', 'zilusdt', 'sandusdt',
      'popusdt', 'alchusdt', 'grassusdt', 'wctusdt', 'penguusdt',
    ],
    bybit: [
      'TRXUSDT', 'ADAUSDT', 'DOGEUSDT', 'TONUSDT', 'NEARUSDT',
      'XLMUSDT', 'ALGOUSDT', 'IOTAUSDT', 'ICPUSDT', 'ZILUSDT', 'SANDUSDT',
      'POPUSDT', 'ALCHUSDT', 'GRASSUSDT', 'WCTUSDT', 'PENGUUSDT',
    ],
    okx: [
      'TRX-USDT', 'ADA-USDT', 'DOGE-USDT', 'TON-USDT', 'NEAR-USDT',
      'XLM-USDT', 'ALGO-USDT', 'IOTA-USDT', 'ICP-USDT', 'ZIL-USDT', 'SAND-USDT',
      'POP-USDT', 'ALCH-USDT', 'GRASS-USDT', 'WCT-USDT', 'PENGU-USDT',
    ],
    gate: [
      'TRX_USDT', 'ADA_USDT', 'DOGE_USDT', 'TON_USDT', 'NEAR_USDT',
      'XLM_USDT', 'ALGO_USDT', 'IOTA_USDT', 'ICP_USDT', 'ZIL_USDT', 'SAND_USDT',
      'POP_USDT', 'ALCH_USDT', 'GRASS_USDT', 'WCT_USDT', 'PENGU_USDT',
    ],
    mexc: [
      'TRXUSDT', 'ADAUSDT', 'DOGEUSDT', 'TONUSDT', 'NEARUSDT',
      'XLMUSDT', 'ALGOUSDT', 'IOTAUSDT', 'ICPUSDT', 'ZILUSDT', 'SANDUSDT',
      'POPUSDT', 'ALCHUSDT', 'GRASSUSDT', 'WCTUSDT', 'PENGUUSDT',
    ],
    bitget: [
      'TRXUSDT', 'ADAUSDT', 'DOGEUSDT', 'TONUSDT', 'NEARUSDT',
      'XLMUSDT', 'ALGOUSDT', 'IOTAUSDT', 'ICPUSDT', 'ZILUSDT', 'SANDUSDT',
      'POPUSDT', 'ALCHUSDT', 'GRASSUSDT', 'WCTUSDT', 'PENGUUSDT',
    ],
  };

  constructor(private readonly analyzer: TickerAnalyzerService) {
    this.connectToExchanges();
  }

  connectToExchanges() {
    Object.entries(this.tickersPerExchange).forEach(([exchange, tickers]) => {
      if (exchange === 'binance') {
        tickers.forEach((ticker) => {
          const url = this.getUrl(exchange, ticker);
          if (!url) return;

          const ws = new WebSocket(url);
          const start = Date.now();

          ws.on('open', () => console.log(`[${exchange}] Connected to ${ticker}`));

          ws.on('message', (data) => {
            const latency = Date.now() - start;
            const parsed = this.parseMessage(exchange, data.toString(), ticker, latency);
            if (parsed) this.analyzer.collectPrice(parsed);
          });

          ws.on('error', (err) => console.error(`[${exchange}] WebSocket error:`, err.message));
        });
      } else {
        const url = this.getUrl(exchange, tickers[0]);
        if (!url) return;

        const ws = new WebSocket(url);
        const start = Date.now();

        ws.on('open', () => {
          console.log(`[${exchange}] WebSocket connected`);
          tickers.forEach((ticker) => {
            const subscribeMessage = this.getSubscribeMessage(exchange, ticker);
            if (subscribeMessage) ws.send(subscribeMessage);
          });
        });

        ws.on('message', (data) => {
          const latency = Date.now() - start;
          const parsed = this.parseMessage(exchange, data.toString(), '', latency);
          if (parsed) this.analyzer.collectPrice(parsed);
        });

        ws.on('error', (err) => console.error(`[${exchange}] WebSocket error:`, err.message));
      }
    });
  }

  getUrl(exchange: string, ticker: string): string | null {
    switch (exchange) {
      case 'binance':
        return `wss://stream.binance.com:9443/ws/${ticker}@ticker`;
      case 'bybit':
        return `wss://stream.bybit.com/spot/quote/ws/v2`;
      case 'okx':
        return `wss://ws.okx.com:8443/ws/v5/public`;
      case 'gate':
        return `wss://api.gateio.ws/ws/v4/spot/`;
      case 'mexc':
        return `wss://wbs.mexc.com/ws`;
      case 'bitget':
        return `wss://ws.bitget.com/spot/v1/stream`;
      default:
        return null;
    }
  }

  getSubscribeMessage(exchange: string, ticker: string): string | null {
    switch (exchange) {
      case 'bybit':
        return JSON.stringify({ op: 'subscribe', args: [`tickers.${ticker}`] });
      case 'okx':
        return JSON.stringify({ op: 'subscribe', args: [{ channel: 'tickers', instId: ticker }] });
      case 'gate':
        return JSON.stringify({ time: Date.now(), channel: 'spot.tickers', event: 'subscribe', payload: [ticker] });
      case 'mexc':
        return JSON.stringify({ method: 'SUBSCRIPTION', params: [`${ticker}@ticker`], id: Date.now() });
      case 'bitget':
        return JSON.stringify({ op: 'subscribe', args: [{ instType: 'SPOT', channel: 'ticker', instId: ticker }] });
      default:
        return null;
    }
  }

  parseMessage(exchange: string, msg: string, expectedTicker: string, latency: number) {
    try {
      const data = JSON.parse(msg);

      switch (exchange) {
        case 'binance':
          if (data.e !== '24hrTicker') return null;
          return this.formatParsed(data.s, parseFloat(data.c), data.E, exchange, latency);

        case 'bybit':
          if (data.topic?.startsWith('tickers.') && data.data)
            return this.formatParsed(data.data.symbol, parseFloat(data.data.lastPrice), data.ts, exchange, latency);
          break;

        case 'okx':
          if (data.arg?.channel === 'tickers' && data.data?.[0])
            return this.formatParsed(data.data[0].instId.replace('-', ''), parseFloat(data.data[0].last), parseInt(data.data[0].ts), exchange, latency);
          break;

        case 'gate':
          if (data.channel === 'spot.tickers' && data.result)
            return this.formatParsed(data.result.currency_pair.replace('_', ''), parseFloat(data.result.last), Date.now(), exchange, latency);
          break;

        case 'mexc':
          if (data?.data?.p && data.s)
            return this.formatParsed(data.s, parseFloat(data.data.p), Date.now(), exchange, latency);
          break;

        case 'bitget':
          if (data.arg?.channel === 'ticker' && Array.isArray(data.data) && data.data[0])
            return this.formatParsed(data.arg.instId.replace('-', ''), parseFloat(data.data[0].last), parseInt(data.data[0].ts), exchange, latency);
          break;
      }
      return null;
    } catch (err) {
      console.error(`[${exchange}] Failed to parse message`, err.message);
      return null;
    }
  }

  private formatParsed(symbol: string, price: number, timestamp: number, exchange: string, latency: number) {
    return { symbol, price, timestamp, exchange, latency, ticker: symbol.replace('-', '').toUpperCase() };
  }
}