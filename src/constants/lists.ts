const PANCAKESWAP_EXTENDED = 'https://tokens.pancakeswap.finance/pancakeswap-extended.json'
const PANCAKESWAP_TOP = 'https://tokens.pancakeswap.finance/pancakeswap-top-100.json'

// only load blocked list if on app url
export const UNSUPPORTED_LIST_URLS: string[] = []

// lower index == higher priority for token import
export const DEFAULT_LIST_OF_LISTS: string[] = [
  PANCAKESWAP_EXTENDED,
  PANCAKESWAP_TOP,
  ...UNSUPPORTED_LIST_URLS, // need to load unsupported tokens as well
]

// default lists to be 'active' aka searched across
export const DEFAULT_ACTIVE_LIST_URLS: string[] = []
