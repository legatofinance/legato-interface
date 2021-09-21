import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import JSBI from 'jsbi'

import { LDOGE } from '../constants/tokens'
import { SupportedChainId } from '../constants/chains'

const MIN_NATIVE_CURRENCY_FOR_GAS: JSBI = JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(16)) // .01 ETH
const MIN_LDOGE_TO_NOT_DECREASE_HOLDERS: JSBI = JSBI.BigInt(1) // 1 WEI
/**
 * Given some token amount, return the max that can be spent of it
 * @param currencyAmount to return max of
 */
export function maxAmountSpend(currencyAmount?: CurrencyAmount<Currency>): CurrencyAmount<Currency> | undefined {
  if (!currencyAmount) return undefined
  if (currencyAmount.currency.isNative) {
    if (JSBI.greaterThan(currencyAmount.quotient, MIN_NATIVE_CURRENCY_FOR_GAS)) {
      return CurrencyAmount.fromRawAmount(
        currencyAmount.currency,
        JSBI.subtract(currencyAmount.quotient, MIN_NATIVE_CURRENCY_FOR_GAS)
      )
    } else {
      return CurrencyAmount.fromRawAmount(currencyAmount.currency, JSBI.BigInt(0))
    }
  }
  if (
    currencyAmount.currency.equals(LDOGE[SupportedChainId.MAINNET]) ||
    currencyAmount.currency.equals(LDOGE[SupportedChainId.TESTNET])
  ) {
    if (JSBI.greaterThan(currencyAmount.quotient, MIN_LDOGE_TO_NOT_DECREASE_HOLDERS)) {
      return CurrencyAmount.fromRawAmount(
        currencyAmount.currency,
        JSBI.subtract(currencyAmount.quotient, MIN_LDOGE_TO_NOT_DECREASE_HOLDERS)
      )
    } else {
      return CurrencyAmount.fromRawAmount(currencyAmount.currency, JSBI.BigInt(0))
    }
  }
  return currencyAmount
}
