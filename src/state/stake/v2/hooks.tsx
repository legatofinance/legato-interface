import { useCallback, useMemo } from 'react'
import { AppState } from '../../index'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import { useActiveWeb3React } from 'hooks/web3'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import JSBI from 'jsbi'

import { useCurrencyBalances } from '../../wallet/hooks'
import { tryParseAmount } from '../../swap/hooks'
import { Field, typeReward, typePoolLifespan } from './actions'

export function useV2StakeState(): AppState['stakeV2'] {
  return useAppSelector((state) => state.stakeV2)
}

export function useV2StakeActionHandlers(): {
  onDepositRewardInput: (typedValue: string) => void
  onPoolLifespanInput: (typedValue: string) => void
} {
  const dispatch = useAppDispatch()

  const onDepositRewardInput = useCallback(
    (typedValue: string) => {
      dispatch(typeReward({ typedValue }))
    },
    [dispatch]
  )

  const onPoolLifespanInput = useCallback(
    (typedValue: string) => {
      dispatch(typePoolLifespan({ typedValue }))
    },
    [dispatch]
  )

  return {
    onDepositRewardInput,
    onPoolLifespanInput,
  }
}

export function useV2DerivedStakeInfo(
  stakedCurrency?: Currency,
  stakedCurrencyA?: Currency,
  stakedCurrencyB?: Currency,
  rewardCurrency?: Currency
): {
  currencyBalances: { [field in Field]?: CurrencyAmount<Currency> }
  currencies: { [field in Field]?: Currency }
  parsedAmounts: { [field in Field]?: CurrencyAmount<Currency> }
  poolLifespan: JSBI
} {
  const { account } = useActiveWeb3React()

  // stake state
  const { typedRewardValue, typedPoolLifespanValue } = useV2StakeState()

  // formatted with tokens
  const [tokenReward] = useMemo(() => [rewardCurrency?.wrapped], [rewardCurrency])

  // currencies
  const currencies: { [field in Field]?: Currency } = useMemo(
    () => ({
      [Field.CURRENCY_STAKED]: stakedCurrency,
      [Field.CURRENCY_STAKED_A]: stakedCurrencyA,
      [Field.CURRENCY_STAKED_B]: stakedCurrencyB,
      [Field.CURRENCY_REWARD]: rewardCurrency,
    }),
    [stakedCurrency, stakedCurrencyA, stakedCurrencyB, rewardCurrency]
  )

  // balances
  const balances = useCurrencyBalances(account ?? undefined, [currencies[Field.CURRENCY_REWARD]])
  const currencyBalances: { [field in Field]?: CurrencyAmount<Currency> } = {
    [Field.CURRENCY_REWARD]: balances[0],
  }

  // amounts
  const rewardAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(
    typedRewardValue,
    currencies[Field.CURRENCY_REWARD]
  )

  const poolLifespan = JSBI.BigInt(isNaN(+typedPoolLifespanValue) ? 0 : +typedPoolLifespanValue)

  const maxTokensPerDayAmount: CurrencyAmount<Currency> | undefined = JSBI.equal(poolLifespan, JSBI.BigInt('0'))
    ? undefined
    : rewardAmount?.divide(poolLifespan)

  const parsedAmounts: { [field in Field]?: CurrencyAmount<Currency> | undefined } = useMemo(() => {
    return {
      [Field.CURRENCY_REWARD]: rewardAmount,
      [Field.POOL_LIFESPAN]: maxTokensPerDayAmount,
    }
  }, [rewardAmount])

  return {
    currencyBalances,
    currencies,
    parsedAmounts,
    poolLifespan,
  }
}
