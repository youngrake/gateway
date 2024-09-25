import { JupiterLPish } from "../../services/common-interfaces";
import { Solana } from '../../chains/solana/solana';
import {
  InitializationError,
  SERVICE_UNITIALIZED_ERROR_CODE,
  SERVICE_UNITIALIZED_ERROR_MESSAGE
} from '../../services/error-handler';
import { logger } from "../../services/logger";
import { TokenInfo } from "@solana/spl-token-registry";
import { Wallet } from "ethers";

export interface JupiterTrade {
  inputMint: string,
  inAmount: string,
  outputMint: string,
  outAmount: string,
  otherAmountThreshold: string,
  swapMode: string,
  slippageBps: number,
  platformFee: any,
  priceImpactPct: string,
  routePlan: any[],
  contextSlot: number,
  timeTaken: number,
  executionPrice: any,
  price?: string
}


export class Jupiter implements JupiterLPish{
  private static _instances: { [name: string]: Jupiter };
  protected chain: Solana;
  private _ready: boolean = false;
  private tokenList: TokenInfo[] = [];

  private constructor(chain: string, network: string) {
    if (chain === 'solana') {
      this.chain = Solana.getInstance(network);
    } else {
      throw new Error('Unsupported chain');
    }
  }

  public async init() {
    const chainName = this.chain.toString();
    if (!this.chain.ready())
      throw new InitializationError(
        SERVICE_UNITIALIZED_ERROR_MESSAGE(chainName),
        SERVICE_UNITIALIZED_ERROR_CODE
      );

    this.tokenList = await this.chain.getTokenList();

    this._ready = true;
  }

  // public async init() {
  //   const chainName = this.chain.toString();
  //   if (!this.chain.ready())
  //     throw new InitializationError(
  //       SERVICE_UNITIALIZED_ERROR_MESSAGE(chainName),
  //       SERVICE_UNITIALIZED_ERROR_CODE,
  //     );
  //   for (const token of this.chain.storedTokenList) {
  //     this.tokenList[token.address] = new Token(
  //       this.chainId,
  //       token.address,
  //       token.decimals,
  //       token.symbol,
  //       token.name,
  //     );
  //   }
  //   this._ready = true;
  // }


  /*
   * Given a token's address, return the connector's native representation of
   * the token.
   *
   * @param address Token address
   */
  public getTokenByAddress(address: string): TokenInfo {
    return this.tokenList.find(x => x.address === address)!;
  }

  public ready(): boolean {
    return this._ready;
  }

  public static getInstance(chain: string, network: string): Jupiter {
    if (Jupiter._instances === undefined) {
      Jupiter._instances = {};
    }
    if (!(chain + network in Jupiter._instances)) {
      Jupiter._instances[chain + network] = new Jupiter(
        chain,
        network,
      );
    }

    return Jupiter._instances[chain + network];
  }

  public getAmount(token: TokenInfo, amount: string): string{
    let r = parseFloat(amount)

    let c = 0
    while (Math.floor(r) !== r){
      r = r * 10
      c += 1
    }

    return r + "0".repeat(Math.max(token.decimals - c, 0))
  }

  public parseAmount(token: TokenInfo, amount: string): number{
    return parseInt(amount)/parseFloat("1" + "0".repeat(token.decimals))
  }
  /**
   * https://station.jup.ag/docs/apis/swap-api
   *
   * Example
   * Swapping SOL to USDC with input 0.1 SOL and 0.5% slippage
   * https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50
   *
   * @param quoteToken Token input for the transaction
   * @param baseToken Token output from the transaction
   * @param amount Amount of `baseToken` desired from the transaction
   * @param _allowedSlippage (Optional) Fraction in string representing the allowed slippage for this transaction
   */
  async estimateBuyTrade(
    quoteToken: TokenInfo,
    baseToken: TokenInfo,
    amount: string,
    _allowedSlippage?: string,
  ): Promise<JupiterTrade> {
    logger.info(
      `Fetching pair data for ${quoteToken.symbol}->${baseToken.symbol}. (estimateBuyTrade)`,
    );


    // 0.5% slippage default
    if (!_allowedSlippage){
      _allowedSlippage = '50'
    }

    const amountBig: any = this.getAmount(quoteToken, amount)
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${quoteToken.address}&outputMint=${baseToken.address}&amount=${amountBig}&slippageBps=${_allowedSlippage}`
    const quoteResponse = await (await fetch(url)).json();
    const priceImpactPct = parseFloat(quoteResponse['priceImpactPct']) * 100

    const outAmount = this.parseAmount(baseToken, quoteResponse['outAmount'])
    console.log(quoteResponse)
    console.log(`${outAmount} ${baseToken.symbol}`, `${priceImpactPct.toFixed(2)}%`)

    return { ...quoteResponse, price: outAmount/parseFloat(amount) + "" }
  }

  /**
   * https://station.jup.ag/docs/apis/swap-api
   *
   * Example
   * Swapping SOL to USDC with input 0.1 SOL and 0.5% slippage
   * https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50
   *
   * @param baseToken Token input for the transaction
   * @param quoteToken Output from the transaction
   * @param amount Amount of `baseToken` to put into the transaction
   * @param _allowedSlippage (Optional) Fraction in string representing the allowed slippage for this transaction
   */
  async estimateSellTrade(
    baseToken: TokenInfo,
    quoteToken: TokenInfo,
    amount: string,
    _allowedSlippage?: string,
    ): Promise<JupiterTrade> {
    logger.info(
      `Fetching pair data for ${baseToken.symbol}->${quoteToken.symbol}. (estimateSellTrade)`,
    );

    // 0.5% slippage default
    if (!_allowedSlippage){
      _allowedSlippage = '50'
    }

    const amountBig: any = this.getAmount(baseToken, amount)
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${baseToken.address}&outputMint=${quoteToken.address}&amount=${amountBig}&slippageBps=${_allowedSlippage}`
    const quoteResponse = await (await fetch(url)).json();
    const priceImpactPct = parseFloat(quoteResponse['priceImpactPct']) * 100

    const outAmount = this.parseAmount(quoteToken, quoteResponse['outAmount'])
    console.log(quoteResponse)
    console.log(`${outAmount} ${quoteToken.symbol}`, `${priceImpactPct.toFixed(2)}%`)

    return { ...quoteResponse, price: outAmount/parseFloat(amount) + "" }
  }

  async executeTrade(
    wallet: Wallet,
  ): Promise<any>{
    console.log(wallet)
  }
}