import { Solana } from "../../chains/solana/solana";
import { PriceRequest, PriceResponse, TradeRequest, TradeResponse } from "../../amm/amm.requests";
import { latency } from "../../services/base";
import { JupiterLPish } from "../../services/common-interfaces";
import { TokenInfo } from "../../chains/ethereum/ethereum-base";
import {
  HttpException,
  PRICE_FAILED_ERROR_CODE,
  PRICE_FAILED_ERROR_MESSAGE,
  TOKEN_NOT_SUPPORTED_ERROR_CODE,
  TOKEN_NOT_SUPPORTED_ERROR_MESSAGE,
  UNKNOWN_ERROR_ERROR_CODE,
  UNKNOWN_ERROR_MESSAGE
} from "../../services/error-handler";
import { JupiterTrade } from "./jupiter";
import Decimal from "decimal.js-light";
import { VersionedTransaction } from "@solana/web3.js";

export interface TradeInfo {
  baseToken: TokenInfo;
  quoteToken: TokenInfo;
  requestAmount: string;
  expectedTrade: JupiterTrade;
}

export function getFullTokenFromSymbol(
  solana: Solana,
  jupiter: JupiterLPish,
  tokenSymbol: string
): TokenInfo {
  const tokenInfo: TokenInfo | undefined =
    solana.getTokenBySymbol(tokenSymbol);
  let fullToken: TokenInfo | undefined;
  if (tokenInfo) {
    fullToken = jupiter.getTokenByAddress(tokenInfo.address);
  }
  if (!fullToken)
    throw new HttpException(
      500,
      TOKEN_NOT_SUPPORTED_ERROR_MESSAGE + tokenSymbol,
      TOKEN_NOT_SUPPORTED_ERROR_CODE
    );
  return fullToken;
}

export async function getTradeInfo(
  solana: Solana,
  jupiter: JupiterLPish,
  baseAsset: string,
  quoteAsset: string,
  amount: string,
  tradeSide: string,
  allowedSlippage?: string
): Promise<TradeInfo> {
  const baseToken: TokenInfo = getFullTokenFromSymbol(
    solana,
    jupiter,
    baseAsset
  );
  const quoteToken: TokenInfo = getFullTokenFromSymbol(
    solana,
    jupiter,
    quoteAsset
  );

  let expectedTrade: JupiterTrade;
  if (tradeSide === 'BUY') {
    expectedTrade = await jupiter.estimateBuyTrade(
      quoteToken,
      baseToken,
      amount,
      allowedSlippage
    );
  } else {
    expectedTrade = await jupiter.estimateSellTrade(
      baseToken,
      quoteToken,
      amount,
      allowedSlippage
    );
  }

  return {
    baseToken,
    quoteToken,
    requestAmount: amount,
    expectedTrade: expectedTrade,
  };
}

export async function price(
  solana: Solana,
  jupiter: JupiterLPish,
  req: PriceRequest
): Promise<PriceResponse> {
  const startTimestamp: number = Date.now();

  console.log('price -> tradeInfo solana jupiter')

  let tradeInfo: TradeInfo;
  try {
    tradeInfo = await getTradeInfo(
      solana,
      jupiter,
      req.base,
      req.quote,
      req.amount,
      req.side,
      req.allowedSlippage
    );
  } catch (e) {
    if (e instanceof Error) {
      throw new HttpException(
        500,
        PRICE_FAILED_ERROR_MESSAGE + e.message,
        PRICE_FAILED_ERROR_CODE
      );
    } else {
      throw new HttpException(
        500,
        UNKNOWN_ERROR_MESSAGE,
        UNKNOWN_ERROR_ERROR_CODE
      );
    }
  }

  const gasPrice = solana.gasPrice;

  return {
    network: req.chain,
    timestamp: startTimestamp,
    latency: latency(startTimestamp, Date.now()),
    base: tradeInfo.baseToken.address,
    quote: tradeInfo.quoteToken.address,
    amount: new Decimal(req.amount).toFixed(tradeInfo.baseToken.decimals),
    rawAmount: tradeInfo.expectedTrade.inAmount,
    expectedAmount: tradeInfo.expectedTrade.outAmount,
    price: tradeInfo.expectedTrade.price!,
    gasPrice: gasPrice,
    gasPriceToken: solana.nativeTokenSymbol,
    gasLimit: 0,
    gasCost: '0',
  };
}

// https://station.jup.ag/docs/apis/swap-api
// https://station.jup.ag/docs/apis/swap-api
// https://station.jup.ag/docs/apis/swap-api
export async function trade(
  solana: Solana,
  jupiter: JupiterLPish,
  req: TradeRequest
): Promise<TradeResponse> {
  const startTimestamp: number = Date.now();

  let tradeInfo: TradeInfo;
  try {
    tradeInfo = await getTradeInfo(
      solana,
      jupiter,
      req.base,
      req.quote,
      req.amount,
      req.side,
      req.allowedSlippage
    );
  } catch (e) {
    if (e instanceof Error) {
      throw new HttpException(
        500,
        PRICE_FAILED_ERROR_MESSAGE + e.message,
        PRICE_FAILED_ERROR_CODE
      );
    } else {
      throw new HttpException(
        500,
        UNKNOWN_ERROR_MESSAGE,
        UNKNOWN_ERROR_ERROR_CODE
      );
    }
  }

  // jupiter.executeTrade()

  const quoteResponse = structuredClone(tradeInfo.expectedTrade)
  delete quoteResponse['price']

  const wallet = await solana.getKeypair(req.address)

  console.log('trade -> tradeInfo solana jupiter', tradeInfo)

  const { swapTransaction } = await (
    await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
      })
    })
  ).json();

  // deserialize the transaction
  const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
  var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
  console.log(transaction);

  // sign the transaction
  transaction.sign([wallet]);

  // Execute the transaction
  const rawTransaction = transaction.serialize()
  const txid = await solana.connection.sendRawTransaction(rawTransaction, {
    skipPreflight: true,
    maxRetries: 2
  });
  await solana.connection.confirmTransaction(txid);
  console.log(`https://solscan.io/tx/${txid}`);

  const gasPrice = solana.gasPrice;

  return {
    network: req.chain,
    timestamp: startTimestamp,
    latency: latency(startTimestamp, Date.now()),
    base: tradeInfo.baseToken.address,
    quote: tradeInfo.quoteToken.address,
    amount: new Decimal(req.amount).toFixed(tradeInfo.baseToken.decimals),
    rawAmount: tradeInfo.expectedTrade.inAmount,
    price: tradeInfo.expectedTrade.price!,
    gasPrice: gasPrice,
    gasPriceToken: solana.nativeTokenSymbol,
    gasLimit: 0,
    gasCost: '0',
    txHash: txid || ''
  }
}