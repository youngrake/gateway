import { JupiterLPish, PositionInfo } from '../../services/common-interfaces';
import { Solana } from '../../chains/solana/solana';
import {
  InitializationError,
  SERVICE_UNITIALIZED_ERROR_CODE,
  SERVICE_UNITIALIZED_ERROR_MESSAGE
} from '../../services/error-handler';

export class Jupiter implements JupiterLPish{
  private static _instances: { [name: string]: Jupiter };
  protected chain: Solana;
  private _ready: boolean = false;
  // private tokenList: TokenInfo[] = [];

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
    // this.tokenList = await this.chain.getTokenList();
    this._ready = true;
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

  async getPositions(): Promise<PositionInfo> {

    return {
      token0: "SOL",
      token1: "USDC",
      // fee: v3.FeeAmount[position.fee],
      // lowerPrice: positionInst.token0PriceLower.toFixed(8),
      // upperPrice: positionInst.token0PriceUpper.toFixed(8),
      // amount0: positionInst.amount0.toFixed(),
      // amount1: positionInst.amount1.toFixed(),
      // unclaimedToken0: utils.formatUnits(
      //   feeInfo.amount0.toString(),
      //   token0.decimals,
      // ),
      // unclaimedToken1: utils.formatUnits(
      //   feeInfo.amount1.toString(),
      //   token1.decimals,
      // ),
    };
  }
}