// src/market/parsed-ticker.interface.ts
export interface ParsedTicker {
    ticker: string;
    price: number;
    timestamp: number;
    exchange: string;
    latency: number;
  }
  