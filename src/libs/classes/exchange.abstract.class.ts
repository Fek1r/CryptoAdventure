import ccxt, { Exchange, OrderBook } from "ccxt";
import { ExchangeEnum } from "../enums/exchange.enum";
import { EventEmitter2 } from "@nestjs/event-emitter";
import{IOrderBookByExchange} from '../interfaces/orderbook-update';

export abstract class ExchangeAbstract<T extends ExchangeEnum>{
    name : T
    
    constructor(
        private readonly eventEmitter : EventEmitter2,
        private readonly exchange : Exchange
    ){}

    async subscribeToOrderBook(tickers : Array<string>){
        try{
            tickers.forEach(async(ticker)=>{
                while(true){
                    const orderBook = await this.exchange.watchOrderBook(ticker);
                    if(orderBook){
                        const updateToSend : IOrderBookByExchange = {
                            exchange : this.name,
                            orderBook,
                        };
                        this.eventEmitter.emitAsync(
                            'orderbook.update',
                            updateToSend
                        );
                    }
                }
            })
        }catch(e)
        {
            console.error("Error listening to orderBooks : ", e)
        }
    }
    

}