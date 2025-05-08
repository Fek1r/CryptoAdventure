import { OrderBook } from "ccxt";
import { ExchangeEnum } from "../enums/exchange.enum";

export interface IOrderBookByExchange{
    exchange : ExchangeEnum,
    orderBook : OrderBook
}

export interface IArbitrageOpportyinity{
    buyExchange : ExchangeEnum,
    sellExchange : ExchangeEnum,
    buyPrice : number;
    sellPrice : number;
    spread : number;
    maxBuyVolume : number;
    maxSellVolume : number;
    availableVolume : number;
}