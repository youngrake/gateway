import {
  buildConfig,
  NetworkConfig as V2NetworkConfig,
} from '../../network/network.utils';
import { ConfigManagerV2 } from '../../services/config-manager-v2';

export namespace RaydiumConfig {
  export interface NetworkConfig extends Omit<V2NetworkConfig, 'tradingTypes'> {
    whirlpoolsConfig: (network: string) => string;
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
      whirlpoolsConfig: (network: string) =>
        ConfigManagerV2.getInstance().get(
          `raydium.contractAddresses.${network}.routerAddress`,
        ),
      tradingTypes: (type: string) => {
        return type === 'swap' ? ['AMM'] : ['AMM_LP'];
      },
    },
  };
}
