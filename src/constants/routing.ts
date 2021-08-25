// a list of tokens by chain
import { Currency, Token } from '@uniswap/sdk-core'
import { SupportedChainId } from './chains'
import { DAI, ExtendedEther, USDT, USDC, UST, BTCB, ETH, WETH9_EXTENDED, BUSD, LDOGE } from './tokens'

type ChainTokenList = {
  readonly [chainId: number]: Token[]
}

type ChainCurrencyList = {
  readonly [chainId: number]: Currency[]
}

const WETH_ONLY: ChainTokenList = Object.fromEntries(
  Object.entries(WETH9_EXTENDED).map(([key, value]) => [key, [value]])
)

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WETH_ONLY,
  [SupportedChainId.MAINNET]: [
    ...WETH_ONLY[SupportedChainId.MAINNET],
    USDT,
    BTCB,
    UST,
    ETH,
    USDC[SupportedChainId.MAINNET],
  ],
}
export const ADDITIONAL_BASES: { [chainId: number]: { [tokenAddress: string]: Token[] } } = {
  [SupportedChainId.MAINNET]: {},
}
/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId: number]: { [tokenAddress: string]: Token[] } } = {
  [SupportedChainId.MAINNET]: {},
}

/**
 * Shows up in the currency select for swap and add liquidity
 */
export const COMMON_BASES: ChainCurrencyList = {
  [SupportedChainId.MAINNET]: [
    ExtendedEther.onChain(SupportedChainId.MAINNET),
    DAI,
    USDC[SupportedChainId.MAINNET],
    USDT,
    BTCB,
    WETH9_EXTENDED[SupportedChainId.MAINNET],
    LDOGE[SupportedChainId.MAINNET],
  ],
  [SupportedChainId.TESTNET]: [
    ExtendedEther.onChain(SupportedChainId.TESTNET),
    WETH9_EXTENDED[SupportedChainId.TESTNET],
    LDOGE[SupportedChainId.TESTNET],
    USDC[SupportedChainId.TESTNET],
  ],
}

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  [SupportedChainId.MAINNET]: [...WETH_ONLY[SupportedChainId.MAINNET], DAI, BUSD[SupportedChainId.MAINNET], USDT],
  [SupportedChainId.TESTNET]: [...WETH_ONLY[SupportedChainId.TESTNET], BUSD[SupportedChainId.TESTNET]],
}
export const PINNED_PAIRS: { readonly [chainId: number]: [Token, Token][] } = {
  [SupportedChainId.MAINNET]: [
    [
      new Token(SupportedChainId.MAINNET, '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643', 8, 'cDAI', 'Compound Dai'),
      new Token(
        SupportedChainId.MAINNET,
        '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
        8,
        'cUSDC',
        'Compound USD Coin'
      ),
    ],
    [USDC[SupportedChainId.MAINNET], USDT],
    [DAI, USDT],
  ],
}
