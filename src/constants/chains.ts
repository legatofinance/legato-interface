export enum SupportedChainId {
  MAINNET = 56,
  TESTNET = 97,
}

export const ALL_SUPPORTED_CHAIN_IDS: SupportedChainId[] = [SupportedChainId.MAINNET, SupportedChainId.TESTNET]

export const L1_CHAIN_IDS = [SupportedChainId.MAINNET, SupportedChainId.TESTNET] as const

export type SupportedL1ChainId = typeof L1_CHAIN_IDS[number]

interface L1ChainInfo {
  readonly docs: string
  readonly explorer: string
  readonly infoLink: string
  readonly label: string
}

type ChainInfo = { readonly [chainId: number]: L1ChainInfo } & { readonly [chainId in SupportedL1ChainId]: L1ChainInfo }

export const CHAIN_INFO: ChainInfo = {
  [SupportedChainId.MAINNET]: {
    docs: 'https://docs.binance.org/',
    explorer: 'https://bscscan.com/',
    infoLink: 'https://pancakeswap.info/',
    label: 'Mainnet',
  },
  [SupportedChainId.TESTNET]: {
    docs: 'https://docs.uniswap.org/',
    explorer: 'https://testnet.bscscan.com/',
    infoLink: 'https://pancakeswap.info/',
    label: 'Testnet',
  },
}
