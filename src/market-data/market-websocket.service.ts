import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';
import { TickerAnalyzerService } from './ticker-analyzer.service';

@Injectable()
export class MarketWebsocketService {
  private readonly tickersPerExchange = {
    binance: [
      'trxusdt',
      'adausdt',
      'dogeusdt',
      'tonusdt',
      'nearusdt',
      'xlmusdt',
      'algousdt',
      'iotausdt',
      'icpusdt',
      'zilusdt',
      'sandusdt',
      // Low cap
      'ctsiusdt',  // Cartesi
      'utkusdt',   // Utrust
      'rlcusdt',   // iExec RLC
      'cotiusdt',  // COTI
      'scrtusdt',  // Secret
    ],
    bybit: [
      'TRXUSDT',
      'ADAUSDT',
      'DOGEUSDT',
      'TONUSDT',
      'NEARUSDT',
      'XLMUSDT',
      'ALGOUSDT',
      'IOTAUSDT',
      'ICPUSDT',
      'ZILUSDT',
      'SANDUSDT',
      // Low cap
      'POPUSDT',   // Popcat
      'ALCHUSDT',  // Alchemist AI
      'GRASSUSDT', // Grass
      'WCTUSDT',   // WalletConnect
      'PENGUUSDT', // Pudgy Penguins
    ],
    okx: [
      'TRX-USDT',
      'ADA-USDT',
      'DOGE-USDT',
      'TON-USDT',
      'NEAR-USDT',
      'XLM-USDT',
      'ALGO-USDT',
      'IOTA-USDT',
      'ICP-USDT',
      'ZIL-USDT',
      'SAND-USDT',
      // Low cap
      'KAS-USDT',    // Kaspa
      'AR-USDT',     // Arweave
      'IMX-USDT',    // Immutable X
      'LOOKS-USDT',  // LooksRare
      'FEPE-USDT',   // Fantasy Pepe
    ],
  };

  constructor(private readonly analyzer: TickerAnalyzerService) {
    this.connectToExchanges();
  }

  connectToExchanges() {
    Object.entries(this.tickersPerExchange).forEach(([exchange, tickers]) => {
      if (exchange === 'binance') {
        // Binance: отдельный сокет на каждый тикер
        tickers.forEach((ticker) => {
          const url = this.getUrl(exchange, ticker);
          if (!url) return;

          const ws = new WebSocket(url);
          const start = Date.now();

          ws.on('open', () => {
            console.log(`[${exchange}] Connected to ${ticker}`);
          });

          ws.on('message', (data) => {
            const latency = Date.now() - start;
            const parsed = this.parseMessage(exchange, data.toString(), ticker, latency);
            if (parsed) this.analyzer.collectPrice(parsed);
          });

          ws.on('error', (err) => {
            console.error(`[${exchange}] WebSocket error:`, err.message);
          });
        });
      } else {
        // Bybit / OKX: один сокет, подписка на все тикеры
        const url = this.getUrl(exchange, tickers[0]);
        if (!url) return;

        const ws = new WebSocket(url);
        const start = Date.now();

        ws.on('open', () => {
          console.log(`[${exchange}] WebSocket connected`);
          tickers.forEach((ticker) => {
            const subscribeMessage = this.getSubscribeMessage(exchange, ticker);
            if (subscribeMessage) {
              ws.send(subscribeMessage);
              console.log(`[${exchange}] Subscribed to ${ticker}`);
            }
          });
        });

        ws.on('message', (data) => {
          const latency = Date.now() - start;
          const parsed = this.parseMessage(exchange, data.toString(), '', latency);
          if (parsed) this.analyzer.collectPrice(parsed);
        });

        ws.on('error', (err) => {
          console.error(`[${exchange}] WebSocket error:`, err.message);
        });
      }
    });
  }

  getUrl(exchange: string, ticker: string): string {
    switch (exchange) {
      case 'binance':
        return `wss://stream.binance.com:9443/ws/${ticker.toLowerCase()}@ticker`;
      case 'bybit':
        return `wss://stream.bybit.com/v5/public/spot`;
      case 'okx':
        return `wss://wspap.okx.com:8443/ws/v5/public`;
      default:
        return '';
    }
  }

  getSubscribeMessage(exchange: string, ticker: string): string | null {
    switch (exchange) {
      case 'bybit':
        return JSON.stringify({
          op: 'subscribe',
          args: [`tickers.${ticker}`],
        });
      case 'okx':
        return JSON.stringify({
          op: 'subscribe',
          args: [{ channel: 'tickers', instId: ticker }],
        });
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
          return {
            symbol: data.s,
            price: parseFloat(data.c),
            timestamp: data.E,
            exchange,
            latency,
            ticker: data.s.toLowerCase(),
          };

        case 'bybit':
          if (data.topic?.startsWith('tickers.') && data.data) {
            return {
              symbol: data.data.symbol,
              price: parseFloat(data.data.lastPrice),
              timestamp: data.ts,
              exchange,
              latency,
              ticker: data.data.symbol,
            };
          }
          break;

          case 'okx':
            if (data.arg?.channel === 'tickers' && data.data?.[0]) {
              const tickerData = data.data[0];
              return {
                symbol: tickerData.instId.replace('-', '').toUpperCase(),
                price: parseFloat(tickerData.last),
                timestamp: parseInt(tickerData.ts),
                exchange,
                latency,
                ticker: tickerData.instId.replace('-', '').toUpperCase(), // <-- исправили тут
              };
            }
            break;
      }

      return null;
    } catch (err) {
      console.error(`[${exchange}] Failed to parse message`, err.message);
      return null;
    }
  }
}
