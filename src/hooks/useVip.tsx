import { CurrencyAmount } from '@uniswap/sdk-core'

import { useSingleCallResult, NEVER_RELOAD } from 'state/multicall/hooks'
import { useV2StakingCreatorContract } from './useContract'
import { useActiveWeb3React } from './web3'
import { LDOGE } from 'constants/tokens'
import { SupportedChainId } from 'constants/chains'

export function useVipStatus() {
  const { chainId, account } = useActiveWeb3React()
  const v2StakingCreatorContract = useV2StakingCreatorContract()

  const isVip = useSingleCallResult(v2StakingCreatorContract, 'hasMinimumLdogeHolding', account ? [account] : [])

  return isVip.result?.[0] ?? false
}

export function useVipMinimumLdogeHolding() {
  const { chainId, account } = useActiveWeb3React()
  const v2StakingCreatorContract = useV2StakingCreatorContract()

  const minimumLdogeHolding = useSingleCallResult(
    v2StakingCreatorContract,
    'computeMinimumLDOGEHoldings',
    [],
    NEVER_RELOAD
  )

  const minimumLdogeHoldingState = minimumLdogeHolding.result?.[0]

  return minimumLdogeHoldingState
    ? CurrencyAmount.fromRawAmount(LDOGE[SupportedChainId.MAINNET], minimumLdogeHoldingState)
    : undefined
}
