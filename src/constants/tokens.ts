import { WETH9, Token } from '@uniswap/sdk-core'
import { BinanceCoin } from './binanceCoin'
import { LDOGE_ADDRESS } from './addresses'
import { SupportedChainId } from './chains'

export const BUSD: { [chainId: number]: Token } = {
  [SupportedChainId.MAINNET]: new Token(
    SupportedChainId.MAINNET,
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    18,
    'BUSD',
    'Binance USD'
  ),
  [SupportedChainId.TESTNET]: new Token(
    SupportedChainId.TESTNET,
    '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee',
    18,
    'BUSD',
    'Binance USD'
  ),
}

export const DAI = new Token(
  SupportedChainId.MAINNET,
  '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
  18,
  'DAI',
  'Dai Stablecoin'
)
export const USDC: { [chainId: number]: Token } = {
  [SupportedChainId.MAINNET]: new Token(
    SupportedChainId.MAINNET,
    '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    18,
    'USDC',
    'Binance-Peg USD Coin'
  ),
  [SupportedChainId.TESTNET]: new Token(
    SupportedChainId.TESTNET,
    '0x64544969ed7ebf5f083679233325356ebe738930',
    18,
    'USDC',
    'Binance-Peg USD Coin'
  ),
}
export const USDT = new Token(
  SupportedChainId.MAINNET,
  '0x55d398326f99059fF775485246999027B3197955',
  18,
  'USDT',
  'Tether USD'
)
export const BTCB = new Token(
  SupportedChainId.MAINNET,
  '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  18,
  'BTCB',
  'Binance BTC'
)
export const UST = new Token(
  SupportedChainId.MAINNET,
  '0x23396cF899Ca06c4472205fC903bDB4de249D6fC',
  18,
  'UST',
  'Wrapped UST Token'
)
export const ETH = new Token(
  SupportedChainId.MAINNET,
  '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  18,
  'ETH',
  'Binance-Peg Ethereum Token'
)

export const LDOGE: { [chainId: number]: Token } = {
  [SupportedChainId.MAINNET]: new Token(
    SupportedChainId.MAINNET,
    LDOGE_ADDRESS[SupportedChainId.MAINNET],
    18,
    'LDOGE',
    'LamboDoge'
  ),
  [SupportedChainId.TESTNET]: new Token(
    SupportedChainId.TESTNET,
    LDOGE_ADDRESS[SupportedChainId.TESTNET],
    18,
    'LDOGE',
    'LamboDoge'
  ),
}

export const WETH9_EXTENDED: { [chainId: number]: Token } = {
  ...WETH9,
  [SupportedChainId.MAINNET]: new Token(
    SupportedChainId.MAINNET,
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    18,
    'WBNB',
    'Wrapped BNB'
  ),
  [SupportedChainId.TESTNET]: new Token(
    SupportedChainId.TESTNET,
    '0xae13d989dac2f0debff460ac112a837c89baa7cd',
    18,
    'WBNB',
    'Wrapped BNB'
  ),
}

export class ExtendedEther extends BinanceCoin {
  public get wrapped(): Token {
    if (this.chainId in WETH9_EXTENDED) return WETH9_EXTENDED[this.chainId]
    throw new Error('Unsupported chain ID')
  }

  private static _cachedEther: { [chainId: number]: ExtendedEther } = {}

  public static onChain(chainId: number): ExtendedEther {
    return this._cachedEther[chainId] ?? (this._cachedEther[chainId] = new ExtendedEther(chainId))
  }
}
