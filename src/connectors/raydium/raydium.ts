import { Token } from '@balancer-labs/sdk';
import { RaydiumConfig } from './raydium.config';
import { getAddress } from 'ethers/lib/utils';
import { Percent } from '@pangolindex/sdk';
import { isFractionString } from '../../services/validators';
import { percentRegexp } from '../../services/config-manager-v2';
import { Solana } from '../../chains/solana/solana';
import {
  InitializationError,
  SERVICE_UNITIALIZED_ERROR_CODE,
  SERVICE_UNITIALIZED_ERROR_MESSAGE,
} from '../../services/error-handler';

export class Raydium {
  private static _instances: { [name: string]: Raydium };
  private chain: Solana;
  private _ttl: number;
  private tokenList: Record<string, Token> = {};
  private _ready: boolean = false;

  private constructor(chain: string, network: string) {
    const config = RaydiumConfig.config;

    if (chain === 'solana') {
      this.chain = Solana.getInstance(network);
    } else {
      throw new Error('Unsupported chain');
    }
    this._ttl = config.ttl;
  }

  public static getInstance(chain: string, network: string): Raydium {
    if (Raydium._instances === undefined) {
      Raydium._instances = {};
    }
    if (!(chain + network in Raydium._instances)) {
      Raydium._instances[chain + network] = new Raydium(chain, network);
    }

    return Raydium._instances[chain + network];
  }

  public async init() {
    const chainName = this.chain.toString();
    if (!this.chain.ready())
      throw new InitializationError(
        SERVICE_UNITIALIZED_ERROR_MESSAGE(chainName),
        SERVICE_UNITIALIZED_ERROR_CODE,
      );
    // this.tokenList = await this.chain.getTokenList();
    this._ready = true;
  }

  /**
   * Given a token's address, return the connector's native representation of
   * the token.
   *
   * @param address Token address
   */
  public getTokenByAddress(address: string): any {
    return this.tokenList[getAddress(address)];
  }

  /**
   * Default time-to-live for swap transactions, in seconds.
   */
  public get ttl(): number {
    return this._ttl;
  }

  public ready(): boolean {
    return this._ready;
  }

  /**
   * Gets the allowed slippage percent from the optional parameter or the value
   * in the configuration.
   *
   * @param allowedSlippageStr (Optional) should be of the form '1/10'.
   */
  public getAllowedSlippage(allowedSlippageStr?: string): Percent {
    if (allowedSlippageStr != null && isFractionString(allowedSlippageStr)) {
      const fractionSplit = allowedSlippageStr.split('/');
      return new Percent(fractionSplit[0], fractionSplit[1]);
    }

    const allowedSlippage = RaydiumConfig.config.allowedSlippage;
    const nd = allowedSlippage.match(percentRegexp);
    if (nd) return new Percent(nd[1], nd[2]);
    throw new Error(
      'Encountered a malformed percent string in the config for ALLOWED_SLIPPAGE.',
    );
  }

  estimateSellTrade(): Promise<any> {
    return Promise.resolve({});
  }

  estimateBuyTrade(): Promise<any> {
    return Promise.resolve({});
  }

  // https://github.com/raydium-io/raydium-sdk-V2-demo/blob/master/src/amm/swap.ts#L67
  executeTrade(): Promise<any> {
    return Promise.resolve({});
  }
}
