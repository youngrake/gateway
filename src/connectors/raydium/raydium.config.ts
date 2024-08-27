import {
  buildConfig,
  NetworkConfig as V2NetworkConfig,
} from '../../network/network.utils';

export namespace RaydiumConfig {
  export interface NetworkConfig extends Omit<V2NetworkConfig, 'tradingTypes'> {
    tradingTypes: (type: string) => Array<string>;
  }

  export const v2Config: V2NetworkConfig = buildConfig(
    'raydium',
    ['AMM'],
    [{ chain: 'solana', networks: ['mainnet-beta', 'devnet'] }],
    'SOLANA',
  );

  export const config: NetworkConfig = {
    ...v2Config,
    ...{
      tradingTypes: (type: string) => {
        return type === 'swap' ? ['AMM'] : ['AMM_LP'];
      },
    },
  };
}
