import { t } from '@lingui/macro'
import { BigNumber } from '@ethersproject/bignumber'
import { Token, CurrencyAmount, Fraction } from '@uniswap/sdk-core'
import { Pair } from '@lambodoge/sdk'
import JSBI from 'jsbi'
import { useMemo } from 'react'
import { DAI, LDOGE, USDC, USDT, BTCB, WETH9_EXTENDED } from '../../constants/tokens'
import { useActiveWeb3React } from '../../hooks/web3'
import { useStakingContract } from '../../hooks/useContract'
import { useToken, useTokens } from 'hooks/Tokens'
import {
  useMultipleContractSingleData,
  useSingleContractMultipleData,
  useSingleCallResult,
  OptionalMethodInputs,
  MethodArg,
  NEVER_RELOAD,
} from '../multicall/hooks'
import { tryParseAmount } from '../swap/hooks'
import useCurrentBlockTimestamp from 'hooks/useCurrentBlockTimestamp'
import { Interface } from '@ethersproject/abi'
import STAKING_ROUTER_ABI from 'abis/staking-router.json'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { STAKING_ROUTER_ADDRESS } from 'constants/addresses'
import { SupportedChainId } from 'constants/chains'
import { BIG_INT_SECONDS_IN_YEAR } from 'constants/misc'

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)
const STAKING_ROUTER_INTERFACE = new Interface(STAKING_ROUTER_ABI)

export const STAKING_GENESIS = 1600387200

export const REWARDS_DURATION_DAYS = 60

export interface StakingInfo {
  // Pool index
  poolIndex: number
  // Pool unique identifier
  poolUid: string
  // the tokens to stake
  stakedToken: Token
  // the tokens to reward
  rewardToken: Token
  // the tokens of the staked pair
  // undefined if not a pair
  stakedPairTokens: [Token, Token] | undefined
  // the amount of token currently staked, or undefined if no account
  stakedAmount: CurrencyAmount<Token>
  // the total amount of token staked in the contract
  totalStakedAmount: CurrencyAmount<Token>
  // the amount of reward token possibly earned by the active account, or undefined if no account
  unclaimedAmount: CurrencyAmount<Token>
  // the amount of reward token earned by the active account, or undefined if no account
  claimedAmount: CurrencyAmount<Token>
  // the amount of token distributed per second to all LPs, constant
  apy: Fraction
  // the current amount of token distributed to the active account per second.
  // equivalent to percent of total supply * reward rate
  rewardRate: CurrencyAmount<Token>
  // the amount of token distributed per second to all LPs, constant
  totalRewardRate: CurrencyAmount<Token>
  // the amount of token distributed per second to the active account
  userRewardRate: CurrencyAmount<Token>
  // calculates a hypothetical amount of token distributed to the active account per second.
  getHypotheticalRewardRate: (
    rewardToken: Token,
    stakedAmount: CurrencyAmount<Token>,
    totalStakedAmount: CurrencyAmount<Token>,
    totalRewardRate: CurrencyAmount<Token>
  ) => CurrencyAmount<Token>
  // Is the pool for staking
  open: boolean
}

// gets the staking info from the network for the active chain id
export function useStakingInfo(): StakingInfo[] | undefined {
  const { chainId, account } = useActiveWeb3React()
  const stackingContract = useStakingContract()

  // detect if staking is ended
  const currentBlockTimestamp = useCurrentBlockTimestamp()

  const ldoge = chainId ? LDOGE[chainId] : undefined

  // get all the info from the staking rewards contracts
  const listPools = useSingleCallResult(stackingContract, 'listPools')

  const [poolIdAndAccount, poolId] = useMemo(() => {
    return (
      listPools.result?.[0].reduce(
        (memo: [OptionalMethodInputs[], OptionalMethodInputs[]], pool: Array<MethodArg>) => {
          memo[0].push([pool[1], account ?? undefined])
          memo[1].push([pool[1]])
          return memo
        },
        [[], []]
      ) ?? [[], []]
    )
  }, [listPools, account])
  const stakedAmounts = useSingleContractMultipleData(stackingContract, 'getUserStakes', poolIdAndAccount ?? [])
  const totalStaked = useSingleContractMultipleData(stackingContract, 'getTotalStaked', poolId ?? [])
  const totalRewards = useSingleContractMultipleData(stackingContract, 'getRewardPool', poolId ?? [])
  const unclaimedAmounts = useSingleContractMultipleData(stackingContract, 'estimatedRewards', poolIdAndAccount ?? [])
  const claimedAmounts = useSingleContractMultipleData(stackingContract, 'getUserRewards', poolIdAndAccount ?? [])

  const minStakers = useSingleContractMultipleData(stackingContract, 'getMinStakersForFullReward', poolId ?? [])
  const minTotalStaked = useSingleContractMultipleData(stackingContract, 'getMinTotalStakedForFullReward', poolId ?? [])
  const countStakers = useSingleContractMultipleData(stackingContract, 'getCountStakers', poolId ?? [])

  const stakedTokensAddresses = useMemo(
    () => listPools.result?.[0].map((pool: Array<MethodArg>) => pool[2]) ?? [],
    [listPools]
  )
  const rewardTokensAddresses = useMemo(
    () => listPools.result?.[0].map((pool: Array<MethodArg>) => pool[3]) ?? [],
    [listPools]
  )

  const stakedTokens = useTokens(stakedTokensAddresses)
  const rewardTokens = useTokens(rewardTokensAddresses)

  const stakedPairsToken0Addresses = useMultipleContractSingleData(
    stakedTokensAddresses,
    PAIR_INTERFACE,
    'token0',
    undefined,
    NEVER_RELOAD
  )
  const stakedPairsToken1Addresses = useMultipleContractSingleData(
    stakedTokensAddresses,
    PAIR_INTERFACE,
    'token1',
    undefined,
    NEVER_RELOAD
  )

  const stakedPairsToken0 = useTokens(
    stakedPairsToken0Addresses.map((stakedPairsToken0Address) => stakedPairsToken0Address.result?.[0] ?? undefined)
  )
  const stakedPairsToken1 = useTokens(
    stakedPairsToken1Addresses.map((stakedPairsToken1Address) => stakedPairsToken1Address.result?.[0] ?? undefined)
  )

  return useMemo(() => {
    if (!chainId || !listPools.result?.[0]) return undefined

    const stakingInfos: StakingInfo[] = []

    for (let i = 0; i < listPools.result?.[0].length ?? 0; i++) {
      const stakedAmountState = stakedAmounts[i]
      const totalStakedState = totalStaked[i]
      const totalRewardsState = totalRewards[i]
      const unclaimedAmountState = unclaimedAmounts[i]
      const claimedAmountState = claimedAmounts[i]
      const minStakersState = minStakers[i]
      const minTotalStakedState = minTotalStaked[i]
      const countStakersState = countStakers[i]
      const stakedPairsToken0State = stakedPairsToken0?.[i]
      const stakedPairsToken1State = stakedPairsToken1?.[i]
      const stakedToken = stakedTokens?.[i]
      const rewardToken = rewardTokens?.[i]

      if (!stakedToken || !rewardToken) continue

      const getHypotheticalRewardRate = (
        rewardToken: Token,
        stakedAmount: CurrencyAmount<Token>,
        totalStakedAmount: CurrencyAmount<Token>,
        totalRewardRate: CurrencyAmount<Token>
      ): CurrencyAmount<Token> => {
        return CurrencyAmount.fromRawAmount(
          rewardToken,
          JSBI.greaterThan(totalStakedAmount.quotient, JSBI.BigInt(0))
            ? JSBI.divide(JSBI.multiply(totalRewardRate.quotient, stakedAmount.quotient), totalStakedAmount.quotient)
            : JSBI.BigInt(0)
        )
      }

      let minStakedRewardPercentage = JSBI.divide(
        JSBI.BigInt(minTotalStakedState?.result?.[0] ?? 1),
        JSBI.BigInt(totalStakedState?.result?.[0].eq(0) ? 1 : totalStakedState?.result?.[0] ?? 1)
      )
      if (JSBI.lessThan(minStakedRewardPercentage, JSBI.BigInt(1))) minStakedRewardPercentage = JSBI.BigInt(1)

      let minStakersRewardPercentage = JSBI.divide(
        JSBI.BigInt(minStakersState?.result?.[0] ?? 1),
        JSBI.BigInt(countStakersState?.result?.[0].eq(0) ? 1 : countStakersState?.result?.[0] ?? 1)
      )
      if (JSBI.lessThan(minStakersRewardPercentage, JSBI.BigInt(1))) minStakersRewardPercentage = JSBI.BigInt(1)

      const rewardPercentage = JSBI.multiply(minStakersRewardPercentage, minStakedRewardPercentage)

      let apy = JSBI.divide(JSBI.BigInt(listPools.result?.[0][i][6]), JSBI.BigInt(listPools.result?.[0][i][5]))
      apy = JSBI.multiply(apy, BIG_INT_SECONDS_IN_YEAR)
      apy = JSBI.multiply(apy, JSBI.BigInt(10_000))
      apy = JSBI.divide(apy, rewardPercentage)
      apy = JSBI.divide(apy, JSBI.BigInt(totalStakedState?.result?.[0].eq(0) ? 1 : totalStakedState?.result?.[0] ?? 1))
      apy = JSBI.subtract(apy, JSBI.BigInt(1))

      if (totalStakedState?.result?.[0].eq(0) || !totalStakedState?.result?.[0]) {
        apy = JSBI.multiply(apy, JSBI.BigInt(10))
      }

      const apyFraction = new Fraction(apy, 100)

      const convertedStakedAmount = CurrencyAmount.fromRawAmount(
        stakedToken,
        JSBI.BigInt(stakedAmountState?.result?.[0] ?? 0)
      )

      const convertedTotalStaked = CurrencyAmount.fromRawAmount(
        stakedToken,
        JSBI.BigInt(totalStakedState?.result?.[0] ?? 0)
      )

      const totalRewardRate = CurrencyAmount.fromFractionalAmount(
        rewardToken,
        JSBI.BigInt(listPools.result?.[0][i][6]),
        JSBI.BigInt(listPools.result?.[0][i][5])
      ).divide(rewardPercentage)

      const stakedPairTokens: [Token, Token] | undefined =
        stakedPairsToken0State && stakedPairsToken1State ? [stakedPairsToken0State, stakedPairsToken1State] : undefined

      const unclaimedAmount = CurrencyAmount.fromRawAmount(
        rewardToken,
        JSBI.BigInt(unclaimedAmountState?.result?.[0] ?? 0)
      )

      const claimedAmount = CurrencyAmount.fromRawAmount(rewardToken, JSBI.BigInt(claimedAmountState?.result?.[0] ?? 0))

      const poolIndex = listPools.result?.[0][i][1]?.toNumber() ?? -1

      stakingInfos.push({
        poolIndex: poolIndex,
        poolUid: `v1-${poolIndex}`,
        stakedPairTokens: stakedPairTokens,
        stakedToken: stakedToken,
        rewardToken: rewardToken,
        unclaimedAmount: unclaimedAmount,
        claimedAmount: claimedAmount,
        rewardRate: CurrencyAmount.fromRawAmount(rewardToken, JSBI.BigInt(0)),
        apy: apyFraction,
        stakedAmount: convertedStakedAmount,
        totalStakedAmount: convertedTotalStaked,
        totalRewardRate: totalRewardRate,
        userRewardRate: getHypotheticalRewardRate(
          rewardToken,
          convertedStakedAmount,
          convertedTotalStaked,
          totalRewardRate
        ),
        getHypotheticalRewardRate,
        open: (totalRewardsState?.result?.[0] ?? 0) > 0,
      })
    }

    return stakingInfos
  }, [listPools])
}

export function useTotalUniEarned(): CurrencyAmount<Token> | undefined {
  const { chainId } = useActiveWeb3React()
  const uni = chainId ? LDOGE[chainId] : undefined
  const stakingInfos = useStakingInfo()

  return useMemo(() => {
    if (!uni) return undefined
    return (
      stakingInfos?.reduce(
        (accumulator, stakingInfo) => accumulator.add(stakingInfo.unclaimedAmount),
        CurrencyAmount.fromRawAmount(uni, '0')
      ) ?? CurrencyAmount.fromRawAmount(uni, '0')
    )
  }, [stakingInfos, uni])
}

// based on typed value
export function useDerivedStakeInfo(
  typedValue: string,
  stakingToken: Token | undefined,
  userLiquidityUnstaked: CurrencyAmount<Token> | undefined
): {
  parsedAmount?: CurrencyAmount<Token>
  error?: string
} {
  const { account } = useActiveWeb3React()

  const parsedInput: CurrencyAmount<Token> | undefined = tryParseAmount(typedValue, stakingToken)

  const parsedAmount =
    parsedInput && userLiquidityUnstaked && JSBI.lessThanOrEqual(parsedInput.quotient, userLiquidityUnstaked.quotient)
      ? parsedInput
      : undefined

  let error: string | undefined
  if (!account) {
    error = t`Connect Wallet`
  }
  if (!parsedAmount) {
    error = error ?? t`Enter an amount`
  }

  return {
    parsedAmount,
    error,
  }
}
