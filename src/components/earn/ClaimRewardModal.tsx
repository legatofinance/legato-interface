import { useState, useCallback } from 'react'
import Modal from '../Modal'
import { AutoColumn } from '../Column'
import styled from 'styled-components/macro'
import { RowBetween } from '../Row'
import { TYPE, CloseIcon } from '../../theme'
import { ButtonError } from '../Button'
import { StakingInfo } from '../../state/stake/hooks'
import { useStakingRouterContract } from '../../hooks/useContract'
import { SubmittedView, LoadingView } from '../ModalViews'
import { TransactionResponse } from '@ethersproject/providers'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { useActiveWeb3React } from '../../hooks/web3'
import { t, Trans } from '@lingui/macro'
import { calculateGasMargin } from '../../utils/calculateGasMargin'

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

interface StakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: StakingInfo
  retrieve: boolean
}

export default function ClaimRewardModal({ isOpen, onDismiss, stakingInfo, retrieve }: StakingModalProps) {
  const { account } = useActiveWeb3React()

  // monitor call to help UI loading state
  const addTransaction = useTransactionAdder()
  const [txHash, setTxHash] = useState<string | undefined>()
  const [attemptingTxn, setAttemptingTxn] = useState(false)

  function wrappedOnDismiss() {
    setTxHash(undefined)
    setAttemptingTxn(false)
    onDismiss()
  }

  const stakingContract = useStakingRouterContract(stakingInfo)

  const onHarverstReward = useCallback(
    async (withRetrieve: boolean) => {
      if (!stakingContract) return

      let estimate,
        method: (...args: any) => Promise<TransactionResponse>,
        args: Array<string | string[] | number> = []

      if (withRetrieve) {
        method = stakingContract.retrieveMyRewards
        estimate = stakingContract.estimateGas.retrieveMyRewards
      } else {
        method = stakingContract.claimRewards
        estimate = stakingContract.estimateGas.claimRewards
      }

      if (stakingInfo.version === 1) {
        args = [stakingInfo.poolIndex]
      } else if (stakingInfo.version === 2) {
        args = []
      }

      setAttemptingTxn(true)
      await estimate(...args)
        .then((estimatedGasLimit) =>
          method(...args, {
            gasLimit: calculateGasMargin(estimatedGasLimit),
          }).then((response: any) => {
            addTransaction(response, {
              summary: t`${withRetrieve ? 'Retrieve' : 'Claim'}
              accumulated ${stakingInfo?.rewardToken.symbol} rewards`,
            })

            setTxHash(response.hash)
          })
        )
        .catch((error) => {
          setAttemptingTxn(false)
          // we only care if the error is something _other_ than the user rejected the tx
          if ((error as any)?.code !== 4001) {
            console.error(error)
          }
        })
    },
    [stakingContract]
  )

  const onClaimReward = useCallback(async () => onHarverstReward(false), [onHarverstReward])
  const onRetrieveReward = useCallback(async () => onHarverstReward(true), [onHarverstReward])

  let error: string | undefined
  if (!account) {
    error = t`Connect wallet`
  }
  if (!stakingInfo?.stakedAmount) {
    error = error ?? t`Enter an amount`
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attemptingTxn && !txHash && (
        <ContentWrapper gap="lg">
          <RowBetween>
            <TYPE.mediumHeader>
              <Trans>{retrieve ? 'Retrieve' : 'Claim'}</Trans>
            </TYPE.mediumHeader>
            <CloseIcon onClick={wrappedOnDismiss} />
          </RowBetween>
          {stakingInfo?.unclaimedAmount && (
            <AutoColumn justify="center" gap="md">
              <TYPE.body fontWeight={600} fontSize={36}>
                {stakingInfo?.unclaimedAmount?.toSignificant(6)}
              </TYPE.body>
              <TYPE.body>
                <Trans>Unclaimed {stakingInfo?.rewardToken.symbol}</Trans>
              </TYPE.body>
            </AutoColumn>
          )}
          {stakingInfo?.claimedAmount && retrieve && (
            <AutoColumn justify="center" gap="md">
              <TYPE.body fontWeight={600} fontSize={36}>
                {stakingInfo?.claimedAmount?.toSignificant(6)}
              </TYPE.body>
              <TYPE.body>
                <Trans>Claimed {stakingInfo?.rewardToken.symbol}</Trans>
              </TYPE.body>
            </AutoColumn>
          )}
          <TYPE.subHeader style={{ textAlign: 'center' }}>
            <Trans>
              When you {retrieve ? 'retrieve' : 'claim'} without withdrawing your liquidity remains in the mining pool.
            </Trans>
          </TYPE.subHeader>
          <ButtonError
            disabled={!!error}
            error={!!error && !!stakingInfo?.stakedAmount}
            onClick={retrieve ? onRetrieveReward : onClaimReward}
          >
            {error ?? <Trans>{retrieve ? 'Retrieve' : 'Claim'}</Trans>}
          </ButtonError>
        </ContentWrapper>
      )}
      {attemptingTxn && !txHash && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.body fontSize={20}>
              <Trans>
                {retrieve
                  ? `Retrieving ${stakingInfo?.claimedAmount.add(stakingInfo.unclaimedAmount)?.toSignificant(6)}
                  ${stakingInfo?.rewardToken?.symbol}`
                  : `Claiming ${stakingInfo?.unclaimedAmount?.toSignificant(6)} ${stakingInfo?.rewardToken?.symbol}`}
              </Trans>
            </TYPE.body>
          </AutoColumn>
        </LoadingView>
      )}
      {txHash && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={txHash}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>
              <Trans>Transaction Submitted</Trans>
            </TYPE.largeHeader>
            <TYPE.body fontSize={20}>
              <Trans>
                {retrieve ? 'Retrieved' : 'Claimed'} {stakingInfo?.rewardToken.symbol}!
              </Trans>
            </TYPE.body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
