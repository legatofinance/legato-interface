import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import { Trade as V2Trade } from '@lambodoge/sdk'
import { useMemo } from 'react'
import { useUserSlippageToleranceWithDefault } from '../state/user/hooks'

const V2_SWAP_DEFAULT_SLIPPAGE = new Percent(500, 10_000) // .50%
const ONE_TENTHS_PERCENT = new Percent(500, 10_000) // .10%

export default function useSwapSlippageTolerance(trade: V2Trade<Currency, Currency, TradeType> | undefined): Percent {
  const defaultSlippageTolerance = useMemo(() => {
    if (!trade) return ONE_TENTHS_PERCENT
    return V2_SWAP_DEFAULT_SLIPPAGE
  }, [trade])
  return useUserSlippageToleranceWithDefault(defaultSlippageTolerance)
}
