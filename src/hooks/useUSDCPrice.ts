import { Currency, CurrencyAmount, Price, Token, Fraction } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { Pair } from '@lambodoge/sdk'
import { useMemo } from 'react'
import { SupportedChainId } from '../constants/chains'
import { USDC } from '../constants/tokens'
import { useV2TradeExactOut } from './useV2Trade'
import { useActiveWeb3React } from './web3'
import { useTotalSupply } from './useTotalSupply'

// Stablecoin amounts used when calculating spot price for a given currency.
// The amount is large enough to filter low liquidity pairs.
const STABLECOIN_AMOUNT_OUT: { [chainId: number]: CurrencyAmount<Token> } = {
  [SupportedChainId.MAINNET]: CurrencyAmount.fromRawAmount(USDC[SupportedChainId.MAINNET], 100_000e6),
  [SupportedChainId.TESTNET]: CurrencyAmount.fromRawAmount(USDC[SupportedChainId.TESTNET], 100_000e6),
}

/**
 * Returns the price in USDC of the input currency
 * @param currency currency to compute the USDC price of
 */
export default function useUSDCPrice(currency?: Currency): Price<Currency, Token> | undefined {
  const { chainId } = useActiveWeb3React()

  const amountOut = chainId ? STABLECOIN_AMOUNT_OUT[chainId] : undefined
  const stablecoin = amountOut?.currency

  const v2USDCTrade = useV2TradeExactOut(currency, amountOut, {
    maxHops: 2,
  })

  return useMemo(() => {
    if (!currency || !stablecoin) {
      return undefined
    }

    // handle usdc
    if (currency?.wrapped.equals(stablecoin)) {
      return new Price(stablecoin, stablecoin, '1', '1')
    }

    // use v2 price if available
    if (v2USDCTrade) {
      const { numerator, denominator } = v2USDCTrade.route.midPrice
      return new Price(currency, stablecoin, denominator, numerator)
    }

    return undefined
  }, [currency, stablecoin, v2USDCTrade])
}

export function useUSDCValue(currencyAmount: CurrencyAmount<Currency> | undefined | null) {
  const price = useUSDCPrice(currencyAmount?.currency)

  return useMemo(() => {
    if (!price || !currencyAmount) return null
    try {
      return price.quote(currencyAmount)
    } catch (error) {
      return null
    }
  }, [currencyAmount, price])
}

export function usePairUSDCPrice(pair?: Pair): Price<Currency, Token> | undefined {
  const { chainId } = useActiveWeb3React()

  const amountOut = chainId ? STABLECOIN_AMOUNT_OUT[chainId] : undefined
  const stablecoin = amountOut?.currency

  const totalSupplyOfLiquidityToken = useTotalSupply(pair?.liquidityToken)
  const price = useUSDCPrice(pair?.token0)

  return useMemo(() => {
    let valueOfOneLiquidityTokenInToken0: CurrencyAmount<Token> | undefined = undefined
    if (pair && totalSupplyOfLiquidityToken) {
      valueOfOneLiquidityTokenInToken0 = CurrencyAmount.fromRawAmount(
        pair.token0,
        JSBI.divide(
          JSBI.multiply(
            pair.reserve0.quotient,
            JSBI.BigInt(2) // this is b/c the value of LP shares are ~double the value of the WETH they entitle owner to
          ),
          JSBI.equal(totalSupplyOfLiquidityToken.quotient, JSBI.BigInt(0))
            ? JSBI.BigInt(1)
            : totalSupplyOfLiquidityToken.quotient
        )
      )
    }

    let priceFraction: Fraction | undefined = undefined
    if (price && valueOfOneLiquidityTokenInToken0) {
      priceFraction = price.asFraction.multiply(valueOfOneLiquidityTokenInToken0.asFraction)
    }

    if (pair && priceFraction) {
      return new Price(pair.liquidityToken, stablecoin as Token, priceFraction.denominator, priceFraction.numerator)
    }
    return undefined
  }, [pair, stablecoin, totalSupplyOfLiquidityToken, price])
}

export function usePriceRatio(token0?: Token | Pair, token1?: Token | Pair): Fraction | undefined {
  const priceToken0 = useUSDCPrice(token0 instanceof Token ? (token0 as Token) : undefined)
  const priceToken1 = useUSDCPrice(token1 instanceof Token ? (token1 as Token) : undefined)
  const pricePair0 = usePairUSDCPrice(token0 instanceof Pair ? (token0 as Pair) : undefined)
  const pricePair1 = usePairUSDCPrice(token1 instanceof Pair ? (token1 as Pair) : undefined)

  if ((priceToken0 || pricePair0) && (priceToken1 || pricePair1)) {
    return (priceToken0?.asFraction || pricePair0?.asFraction)?.divide(
      priceToken1?.asFraction || pricePair1?.asFraction || 1
    )
  }
  return undefined
}
