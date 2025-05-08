import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { ExchangeAbstract } from "./libs/classes/exchange.abstract.class";
import { ExchangeEnum } from "./libs/enums/exchange.enum";
import { IArbitrageOpportyinity, IOrderBookByExchange } from "./libs/interfaces/orderbook-update";


export default class ArbitrageProcessor{

    constructor(
        private readonly exchangres : Array<ExchangeAbstract<ExchangeEnum>>,
        private readonly tickers : Array<string>,
        private readonly eventEmitter : EventEmitter2,
        private readonly tickerMap : Map<string, Map<ExchangeEnum, IOrderBookByExchange>>
    ){}

   @OnEvent('orderbook.update')
   async handleOrderBookUpdate(data: IOrderBookByExchange){
    try {
        const ticker = data.orderBook.symbol as string;
        const existing = this.tickerMap.get(ticker);
        if(existing){
            existing.set(data.exchange, data);
        }else{
            this.tickerMap.set(ticker, new Map([[data.exchange, data]]))
        }

    } catch (error) {
       console.error("Failed to update orderBook : ", error) 
    }
   }


   calculateArbitrageOpportynity(ticker : string){
    try {
        const opportynities : Array<IArbitrageOpportyinity> = [];
        const keyValues = this.tickerMap.get(ticker);

        const orderBooks = keyValues?.values();
        if(!orderBooks)return;
        for(let i ; i = 0; i++ in orderBooks){
            const orderBook0 = orderBooks[i];
            for(let j; j = i+1;j++){
                const orderBook1 = orderBooks[j];
                if(Math.abs(orderBook0.))
            } 
        }

        
    } catch (error) {
        console.error(`Failed to calculate arbitrage opportynities for ticker : ${ticker}, err : ${error}`)
    }
   }
}