import { useCallback, useMemo } from 'react'
import { AppState } from '../../index'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import { useActiveWeb3React } from 'hooks/web3'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { Pair } from '@lambodoge/sdk'
import JSBI from 'jsbi'

import { useV2Pair } from 'hooks/useV2Pairs'
import { useCurrencyBalances, useETHBalances } from '../../wallet/hooks'
import { tryParseAmount } from '../../swap/hooks'
import {
  Field,
  typeReward,
  typePoolLifespan,
  typeMinimumStaked,
  typeMinimumTotalStaked,
  typeMinimumStakers,
} from './actions'
import { SP_MAKER_BNB_FEE } from 'constants/misc'

export function useV2StakeState(): AppState['stakeV2'] {
  return useAppSelector((state) => state.stakeV2)
}

export function useV2StakeActionHandlers(): {
  onDepositRewardInput: (typedValue: string) => void
  onPoolLifespanInput: (typedValue: string) => void
  onMinimumStakedInput: (typedValue: string) => void
  onMinimumTotalStakedInput: (typedValue: string) => void
  onMinimumStakersInput: (typedValue: string) => void
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

  const onMinimumStakedInput = useCallback(
    (typedValue: string) => {
      dispatch(typeMinimumStaked({ typedValue }))
    },
    [dispatch]
  )

  const onMinimumTotalStakedInput = useCallback(
    (typedValue: string) => {
      dispatch(typeMinimumTotalStaked({ typedValue }))
    },
    [dispatch]
  )

  const onMinimumStakersInput = useCallback(
    (typedValue: string) => {
      dispatch(typeMinimumStakers({ typedValue }))
    },
    [dispatch]
  )

  return {
    onDepositRewardInput,
    onPoolLifespanInput,
    onMinimumStakedInput,
    onMinimumTotalStakedInput,
    onMinimumStakersInput,
  }
}

export function useV2DerivedStakeInfo(
  liquidityMining: boolean,
  stakedCurrency?: Currency,
  stakedCurrencyA?: Currency,
  stakedCurrencyB?: Currency,
  rewardCurrency?: Currency
): {
  currencyBalances: { [field in Field]?: CurrencyAmount<Currency> }
  currencies: { [field in Field]?: Currency }
  parsedAmounts: { [field in Field]?: CurrencyAmount<Currency> }
  poolLifespan: JSBI
  currencyToStake: Currency | undefined
  pairToStake: Pair | undefined
  minimumStakers: JSBI
  errorMessage?: string
} {
  const { account } = useActiveWeb3React()

  let errorMessage: string | undefined

  // stake state
  const {
    typedRewardValue,
    typedPoolLifespanValue,
    typedMinimumStakedValue,
    typedMinimumTotalStakedValue,
    typedMinimumStakersValue,
  } = useV2StakeState()

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

  // pair
  const [, pairToStake] = useV2Pair(stakedCurrencyA, stakedCurrencyB)

  const currencyToStake = liquidityMining ? pairToStake?.liquidityToken : stakedCurrency

  // balances
  const balances = useCurrencyBalances(account ?? undefined, [currencies[Field.CURRENCY_REWARD]])
  const currencyBalances: { [field in Field]?: CurrencyAmount<Currency> } = {
    [Field.CURRENCY_REWARD]: balances[0],
  }

  const poolLifespan = JSBI.BigInt(isNaN(+typedPoolLifespanValue) ? 0 : +typedPoolLifespanValue)

  const minimumStakers = JSBI.BigInt(isNaN(+typedMinimumStakersValue) ? 0 : +typedMinimumStakersValue)

  // amounts
  const rewardAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(
    typedRewardValue,
    currencies[Field.CURRENCY_REWARD]
  )

  const maxTokensPerDayAmount: CurrencyAmount<Currency> | undefined = JSBI.equal(poolLifespan, JSBI.BigInt('0'))
    ? undefined
    : rewardAmount?.divide(poolLifespan)

  const minimumStakedAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(
    typedMinimumStakedValue,
    currencyToStake
  )

  const minimumTotalStakedAmount: CurrencyAmount<Currency> | undefined = tryParseAmount(
    typedMinimumTotalStakedValue,
    currencyToStake
  )

  const parsedAmounts: { [field in Field]?: CurrencyAmount<Currency> | undefined } = useMemo(() => {
    return {
      [Field.CURRENCY_REWARD]: rewardAmount,
      [Field.POOL_LIFESPAN]: maxTokensPerDayAmount,
      [Field.MINIMUM_STAKED]: minimumStakedAmount,
      [Field.MINIMUM_TOTAL_STAKED]: minimumTotalStakedAmount,
    }
  }, [rewardAmount, maxTokensPerDayAmount, minimumStakedAmount, minimumTotalStakedAmount])

  if (
    !rewardCurrency ||
    !currencyToStake ||
    !parsedAmounts[Field.POOL_LIFESPAN] ||
    !parsedAmounts[Field.MINIMUM_STAKED] ||
    !parsedAmounts[Field.MINIMUM_TOTAL_STAKED] ||
    JSBI.equal(minimumStakers, JSBI.BigInt(0))
  ) {
    errorMessage = 'Incomplete settings'
  }

  // compare input balance to max input based on version
  const rewardBalance = currencyBalances[Field.CURRENCY_REWARD]

  if (rewardBalance && rewardAmount && rewardBalance.lessThan(rewardAmount)) {
    errorMessage = `Insufficient ${rewardBalance.currency.symbol} balance`
  }

  const bnbBalance = useETHBalances(account ? [account] : [])?.[account ?? '']

  if (bnbBalance && bnbBalance.lessThan(SP_MAKER_BNB_FEE)) {
    errorMessage = `Insufficient BNB balance`
  }

  return {
    currencyBalances,
    currencies,
    parsedAmounts,
    poolLifespan,
    currencyToStake,
    pairToStake: liquidityMining ? pairToStake ?? undefined : undefined,
    minimumStakers,
    errorMessage,
  }
}
