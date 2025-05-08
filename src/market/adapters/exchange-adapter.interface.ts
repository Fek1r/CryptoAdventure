import { ParsedTicker } from './parsed-ticker.interface';

export interface ExchangeAdapter {
    getName(): string;
    formatTicker(ticker: string): string | null;
    getWebSocketUrl(): string;
    getSubscribeMessage(ticker: string): string | null;
    parseMessage(message: string, latency: number): ParsedTicker | null;
    getBestBid(ticker: string): Promise<number | null>;
    getBestAsk(ticker: string): Promise<number | null>;
  }