import { useState } from 'react'
import Modal from '../Modal'
import { AutoColumn } from '../Column'
import styled from 'styled-components/macro'
import { RowBetween } from '../Row'
import { TYPE, CloseIcon } from '../../theme'
import { ButtonError } from '../Button'
import { StakingInfo } from '../../state/stake/hooks'
import { useStakingContract } from '../../hooks/useContract'
import { SubmittedView, LoadingView } from '../ModalViews'
import { TransactionResponse } from '@ethersproject/providers'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { useActiveWeb3React } from '../../hooks/web3'
import { t, Trans } from '@lingui/macro'

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
  const [hash, setHash] = useState<string | undefined>()
  const [attempting, setAttempting] = useState(false)

  function wrappedOnDismiss() {
    setHash(undefined)
    setAttempting(false)
    onDismiss()
  }

  const stakingContract = useStakingContract()

  async function onClaimReward() {
    if (stakingContract && stakingInfo?.stakedAmount) {
      setAttempting(true)
      await stakingContract
        .claimRewards(stakingInfo.poolIndex)
        .then((response: TransactionResponse) => {
          addTransaction(response, { summary: t`Claim accumulated ${stakingInfo?.rewardToken.symbol} rewards` })
          setHash(response.hash)
        })
        .catch((error: any) => {
          setAttempting(false)
          console.log(error)
        })
    }
  }

  async function onRetrieveReward() {
    if (stakingContract && stakingInfo?.stakedAmount) {
      setAttempting(true)
      await stakingContract
        .retrieveMyRewards(stakingInfo.poolIndex)
        .then((response: TransactionResponse) => {
          addTransaction(response, { summary: t`Retrieve accumulated ${stakingInfo?.rewardToken.symbol} rewards` })
          setHash(response.hash)
        })
        .catch((error: any) => {
          setAttempting(false)
          console.log(error)
        })
    }
  }

  let error: string | undefined
  if (!account) {
    error = t`Connect wallet`
  }
  if (!stakingInfo?.stakedAmount) {
    error = error ?? t`Enter an amount`
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && !hash && (
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
      {attempting && !hash && (
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
      {hash && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={hash}>
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
