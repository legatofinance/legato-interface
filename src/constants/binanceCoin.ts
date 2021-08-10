import invariant from 'tiny-invariant'
import { NativeCurrency, Currency, Token, WETH9 } from '@uniswap/sdk-core'

/**
 * Ether is the main usage of a 'native' currency, i.e. for Ethereum mainnet and all testnets
 */
export class BinanceCoin extends NativeCurrency {
  protected constructor(chainId: number) {
    super(chainId, 18, 'BNB', 'Binance Coin')
  }

  public get wrapped(): Token {
    const weth9 = WETH9[this.chainId]
    invariant(!!weth9, 'WRAPPED')
    return weth9
  }

  private static _etherCache: { [chainId: number]: BinanceCoin } = {}

  public static onChain(chainId: number): BinanceCoin {
    return this._etherCache[chainId] ?? (this._etherCache[chainId] = new BinanceCoin(chainId))
  }

  public equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId
  }
}
