import { t } from '@lingui/macro'
import { BigNumber } from '@ethersproject/bignumber'
import { Token, CurrencyAmount, Fraction, Percent } from '@uniswap/sdk-core'
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
import { BIG_INT_SECONDS_IN_YEAR, SP_MAKER_BIPS_BASE } from 'constants/misc'
import getPoolUid from 'utils/getPoolUid'

const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)
const STAKING_ROUTER_INTERFACE = new Interface(STAKING_ROUTER_ABI)

export const STAKING_GENESIS = 1600387200

export const REWARDS_DURATION_DAYS = 60

export interface StakingInfo {
  // contract address
  address: string | undefined
  // Version number
  version: number
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
  // Tax on stake
  stakingTax: Percent
  // Tax on unstake
  unstakingTax: Percent
  // Tax on retrieve
  retrievingTax: Percent
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
  const stakeTokenTax = useSingleContractMultipleData(stackingContract, 'getStakeTokenTax', poolId ?? [])
  const unstakeTokenTax = useSingleContractMultipleData(stackingContract, 'getUnstakeTokenTax', poolId ?? [])
  const unstakeRewardTax = useSingleContractMultipleData(stackingContract, 'getUnstakeRewardTax', poolId ?? [])

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
      const stakeTokenTaxState = stakeTokenTax[i]
      const unstakeTokenTaxState = unstakeTokenTax[i]
      const unstakeRewardTaxState = unstakeRewardTax[i]
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

      const totalDeposit = totalStakedState?.result?.[0]
      const totalStakers = countStakersState?.result?.[0]
      const minTotalStakedResult = minTotalStakedState?.result?.[0]
      const minStakersResult = minStakersState?.result?.[0]
      const rewardTokensByPeriod = listPools.result?.[0][i][6]
      const stakePeriod = listPools.result?.[0][i][5]

      let minStakedRatio = new Fraction(minTotalStakedResult ?? 1, totalDeposit?.eq(0) ? 1 : totalDeposit ?? 1)
      if (minStakedRatio.lessThan(1)) minStakedRatio = new Fraction(1)

      let minStakersRatio = new Fraction(minStakersResult ?? 1, totalStakers?.eq(0) ? 1 : totalStakers ?? 1)
      if (minStakersRatio.lessThan(1)) minStakersRatio = new Fraction(1)

      const rewardDivider = minStakersRatio.multiply(minStakedRatio)

      let apy = new Fraction(rewardTokensByPeriod, stakePeriod)
      apy = apy.multiply(BIG_INT_SECONDS_IN_YEAR).multiply(100)

      if (totalDeposit?.eq(0) ?? true) {
        apy = apy.divide(JSBI.BigInt(minTotalStakedResult ?? 1)).divide(JSBI.BigInt(minStakersResult ?? 1))
      } else {
        apy = apy.divide(rewardDivider).divide(JSBI.BigInt(totalDeposit ?? 1))
      }

      const convertedStakedAmount = CurrencyAmount.fromRawAmount(
        stakedToken,
        JSBI.BigInt(stakedAmountState?.result?.[0] ?? 0)
      )

      const convertedTotalStaked = CurrencyAmount.fromRawAmount(stakedToken, JSBI.BigInt(totalDeposit ?? 0))

      const totalRewardRate = CurrencyAmount.fromFractionalAmount(
        rewardToken,
        JSBI.BigInt(rewardTokensByPeriod),
        JSBI.BigInt(stakePeriod)
      ).divide(rewardDivider)

      const stakedPairTokens: [Token, Token] | undefined =
        stakedPairsToken0State && stakedPairsToken1State ? [stakedPairsToken0State, stakedPairsToken1State] : undefined

      const unclaimedAmount = CurrencyAmount.fromRawAmount(
        rewardToken,
        JSBI.BigInt(unclaimedAmountState?.result?.[0] ?? 0)
      )

      const claimedAmount = CurrencyAmount.fromRawAmount(rewardToken, JSBI.BigInt(claimedAmountState?.result?.[0] ?? 0))

      const stakingTax = new Percent(stakeTokenTaxState?.result?.[0] ?? 0, SP_MAKER_BIPS_BASE)
      const unstakingTax = new Percent(unstakeTokenTaxState?.result?.[0] ?? 0, SP_MAKER_BIPS_BASE)
      const retrievingTax = new Percent(unstakeRewardTaxState?.result?.[0] ?? 0, SP_MAKER_BIPS_BASE)

      const poolIndex = listPools.result?.[0][i][1]?.toNumber() ?? -1

      stakingInfos.push({
        address: undefined,
        version: 1,
        poolIndex: poolIndex,
        poolUid: getPoolUid('v1', poolIndex),
        stakedPairTokens: stakedPairTokens,
        stakedToken: stakedToken,
        rewardToken: rewardToken,
        unclaimedAmount: unclaimedAmount,
        claimedAmount: claimedAmount,
        rewardRate: CurrencyAmount.fromRawAmount(rewardToken, JSBI.BigInt(0)),
        apy,
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
  userLiquidityUnstaked: CurrencyAmount<Token> | undefined,
  stakingTokenSymbol: string
): {
  parsedAmount?: CurrencyAmount<Token>
  error?: string
} {
  const { account } = useActiveWeb3React()

  const parsedInput: CurrencyAmount<Token> | undefined = tryParseAmount(typedValue, stakingToken)

  const parsedAmount = parsedInput && userLiquidityUnstaked ? parsedInput : undefined

  let error: string | undefined
  if (!account) {
    error = t`Connect Wallet`
  }
  if (!parsedInput || !userLiquidityUnstaked) {
    error = error ?? t`Enter an amount`
  } else if (!JSBI.lessThanOrEqual(parsedInput.quotient, userLiquidityUnstaked.quotient)) {
    error = error ?? t`Insufficient ${stakingTokenSymbol} balance`
  }

  return {
    parsedAmount,
    error,
  }
}
