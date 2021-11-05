import { useMemo } from 'react'
import { StakingInfo } from 'state/stake/hooks'
import { Token, CurrencyAmount, Fraction, Percent } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import {
  useMultipleContractSingleData,
  useSingleContractMultipleData,
  useSingleCallResult,
  OptionalMethodInputs,
  MethodArg,
  NEVER_RELOAD,
} from 'state/multicall/hooks'
import { useV2StakingCreatorContract } from './useContract'
import { useActiveWeb3React } from './web3'
import { Interface } from '@ethersproject/abi'
import V2_STAKING_ROUTER_ABI from 'abis/v2-staking-router.json'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { useToken, useTokens } from 'hooks/Tokens'
import { BIG_INT_SECONDS_IN_YEAR, SP_MAKER_BIPS_BASE } from 'constants/misc'
import getPoolUid from 'utils/getPoolUid'

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)
const V2_STAKING_ROUTER_INTERFACE = new Interface(V2_STAKING_ROUTER_ABI)

export function useV2StakingPools(): StakingInfo[] | undefined {
  const { chainId, account } = useActiveWeb3React()
  const v2StakingCreatorContract = useV2StakingCreatorContract()

  const lastPoolIndex = useSingleCallResult(v2StakingCreatorContract, '_poolIndex')
  const lastPoolIndexResult = lastPoolIndex.result?.[0]?.toNumber()

  const poolIndexes: OptionalMethodInputs[] = useMemo(
    () => [...Array(lastPoolIndexResult ?? 0).keys()].map((e) => [e]),
    [lastPoolIndexResult]
  )

  const pools = useSingleContractMultipleData(v2StakingCreatorContract, 'getPoolInfoByIndex', poolIndexes)
  const poolAddresses = useSingleContractMultipleData(v2StakingCreatorContract, '_pools', poolIndexes)

  const v2StakingAddresses = useMemo(() => poolAddresses.map((e) => e?.result?.[0]), [poolAddresses])

  const stakedAmounts = useMultipleContractSingleData(
    v2StakingAddresses,
    V2_STAKING_ROUTER_INTERFACE,
    'getUserStakes',
    [account ?? undefined]
  )
  const unclaimedAmounts = useMultipleContractSingleData(
    v2StakingAddresses,
    V2_STAKING_ROUTER_INTERFACE,
    'estimatedRewards',
    [account ?? undefined]
  )
  const claimedAmounts = useMultipleContractSingleData(
    v2StakingAddresses,
    V2_STAKING_ROUTER_INTERFACE,
    'getUserRewards',
    [account ?? undefined]
  )
  const countStakers = useMultipleContractSingleData(v2StakingAddresses, V2_STAKING_ROUTER_INTERFACE, '_countStakers')
  const totalStaked = useMultipleContractSingleData(v2StakingAddresses, V2_STAKING_ROUTER_INTERFACE, '_totalStaked')
  const totalRewards = useMultipleContractSingleData(v2StakingAddresses, V2_STAKING_ROUTER_INTERFACE, '_rewardPool')

  const stakePeriods = useMemo(() => pools.map((e) => e.result?.[0]?.stakePeriod), [pools])
  const rewardTokensByPeriods = useMemo(() => pools.map((e) => e.result?.[0]?.rewardTokensByPeriod), [pools])

  const stakedTokensAddresses = useMemo(() => pools.map((e) => e.result?.[0]?.stakedToken), [pools])
  const rewardTokensAddresses = useMemo(() => pools.map((e) => e.result?.[0]?.rewardToken), [pools])

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
    if (!chainId || !pools) return undefined

    const stakingInfos: StakingInfo[] = []

    for (let i = 0; i < pools.length ?? 0; i++) {
      const stakedAmountState = stakedAmounts[i]
      const totalStakedState = totalStaked[i]
      const totalRewardsState = totalRewards[i]
      const unclaimedAmountState = unclaimedAmounts[i]
      const claimedAmountState = claimedAmounts[i]
      const minStakers = pools[i]?.result?.[0]?.minStakersForFullReward
      const minTotalStaked = pools[i]?.result?.[0]?.minTotalStakedForFullReward
      const countStakersState = countStakers[i]
      const stakePeriod = stakePeriods[i]
      const stakeTokenTax = pools[i]?.result?.[0]?.stakeTax
      const unstakeTokenTax = pools[i]?.result?.[0]?.unstakeTax
      const unstakeRewardTax = pools[i]?.result?.[0]?.unstakeRewardTax
      const rewardTokensByPeriod = rewardTokensByPeriods[i]
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
        JSBI.BigInt(minTotalStaked ?? 1),
        JSBI.BigInt(totalStakedState?.result?.[0].eq(0) ? 1 : totalStakedState?.result?.[0] ?? 1)
      )
      if (JSBI.lessThan(minStakedRewardPercentage, JSBI.BigInt(1))) minStakedRewardPercentage = JSBI.BigInt(1)

      let minStakersRewardPercentage = JSBI.divide(
        JSBI.BigInt(minStakers ?? 1),
        JSBI.BigInt(countStakersState?.result?.[0].eq(0) ? 1 : countStakersState?.result?.[0] ?? 1)
      )
      if (JSBI.lessThan(minStakersRewardPercentage, JSBI.BigInt(1))) minStakersRewardPercentage = JSBI.BigInt(1)

      const rewardPercentage = JSBI.multiply(minStakersRewardPercentage, minStakedRewardPercentage)

      let apy = JSBI.divide(JSBI.BigInt(rewardTokensByPeriod), JSBI.BigInt(stakePeriod))
      apy = JSBI.multiply(apy, BIG_INT_SECONDS_IN_YEAR)
      apy = JSBI.multiply(apy, JSBI.BigInt(10_000))
      apy = JSBI.divide(apy, rewardPercentage)
      apy = JSBI.divide(apy, JSBI.BigInt(totalStakedState?.result?.[0].eq(0) ? 1 : totalStakedState?.result?.[0] ?? 1))
      apy = JSBI.subtract(apy, JSBI.BigInt(1))

      if (totalStakedState?.result?.[0].eq(0) || !totalStakedState?.result?.[0]) {
        apy = JSBI.multiply(apy, JSBI.BigInt(10))
      }

      const apyFraction = new Fraction(apy, 1_000)

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
        JSBI.BigInt(rewardTokensByPeriod),
        JSBI.BigInt(stakePeriod)
      ).divide(rewardPercentage)

      const stakedPairTokens: [Token, Token] | undefined =
        stakedPairsToken0State && stakedPairsToken1State ? [stakedPairsToken0State, stakedPairsToken1State] : undefined

      const unclaimedAmount = CurrencyAmount.fromRawAmount(
        rewardToken,
        JSBI.BigInt(unclaimedAmountState?.result?.[0] ?? 0)
      )

      const claimedAmount = CurrencyAmount.fromRawAmount(rewardToken, JSBI.BigInt(claimedAmountState?.result?.[0] ?? 0))

      const stakingTax = new Percent(stakeTokenTax, SP_MAKER_BIPS_BASE)
      const unstakingTax = new Percent(unstakeTokenTax, SP_MAKER_BIPS_BASE)
      const retrievingTax = new Percent(unstakeRewardTax, SP_MAKER_BIPS_BASE)

      const poolIndex = (poolIndexes[i]?.[0] as number) ?? -1

      stakingInfos.push({
        address: v2StakingAddresses[i],
        poolIndex: poolIndex,
        version: 2,
        poolUid: getPoolUid('v2', poolIndex),
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
        stakingTax,
        unstakingTax,
        retrievingTax,
        open: (totalRewardsState?.result?.[0] ?? 0) > 0,
      })
    }

    return stakingInfos
  }, [chainId, pools])
}
