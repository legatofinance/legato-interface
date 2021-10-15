import { Currency, CurrencyAmount, Price, Token, Fraction } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { Pair } from '@lambodoge/sdk'
import { useMemo } from 'react'
import { SupportedChainId } from '../constants/chains'
import { USDC } from '../constants/tokens'
import { useV2TradeExactOut } from './useV2Trade'
import { useActiveWeb3React } from './web3'
import { useTotalSupply } from './useTotalSupply'
import { usePairContract } from './useContract'
import { useV2Pair } from './useV2Pairs'
import { useMultipleContractSingleData, NEVER_RELOAD } from 'state/multicall/hooks'
import { useTokens } from 'hooks/Tokens'
import { Interface } from '@ethersproject/abi'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)

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
  const pairContract = usePairContract()

  const token = currencyAmount?.currency?.wrapped

  const pairsToken0Addresses = useMultipleContractSingleData(
    [token?.address],
    PAIR_INTERFACE,
    'token0',
    undefined,
    NEVER_RELOAD
  )
  const pairsToken1Addresses = useMultipleContractSingleData(
    [token?.address],
    PAIR_INTERFACE,
    'token1',
    undefined,
    NEVER_RELOAD
  )

  const pairsToken0 = useTokens(
    pairsToken0Addresses.map((pairsToken0Address) => pairsToken0Address.result?.[0] ?? undefined)
  )
  const pairsToken1 = useTokens(
    pairsToken1Addresses.map((pairsToken1Address) => pairsToken1Address.result?.[0] ?? undefined)
  )

  const [, pair] = useV2Pair(pairsToken0?.[0] ?? undefined, pairsToken1?.[0] ?? undefined)

  const tokenPrice = useUSDCPrice(currencyAmount?.currency)
  const pairPrice = usePairUSDCPrice(pair ?? undefined)

  const price = pairPrice ?? tokenPrice

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
      valueOfOneLiquidityTokenInToken0 = CurrencyAmount.fromFractionalAmount(
        pair.token0,
        JSBI.divide(
          JSBI.multiply(
            pair?.reserve0.quotient,
            JSBI.BigInt(2 * 10 ** (pair?.token0.decimals ?? 0)) // this is b/c the value of LP shares are ~double the value of the WETH they entitle owner to
          ),
          JSBI.equal(totalSupplyOfLiquidityToken.quotient, JSBI.BigInt(0))
            ? JSBI.BigInt(1)
            : totalSupplyOfLiquidityToken.quotient
        ),
        10 ** (pair?.token0.decimals ?? 0)
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
