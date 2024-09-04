import { EstimateGasResponse } from '../../amm/amm.requests';
import { Solanaish } from '../../chains/solana/solana';
import { Raydium } from './raydium';

export async function estimateGasRaydium(
  solanaish: Solanaish,
  // @ts-ignore
  raydium: Raydium,
): Promise<EstimateGasResponse> {
  const gasPrice: number = solanaish.gasPrice;
  const gasPriceToken: string = solanaish.nativeTokenSymbol;
  const gasCost: string = solanaish.gasPrice.toFixed(10);

  // @ts-ignore
  return {
    network: solanaish.network,
    timestamp: Date.now(),
    gasPrice,
    gasPriceToken,
    // do not exist on solana
    gasLimit: 0,
    gasCost,
  };
}
