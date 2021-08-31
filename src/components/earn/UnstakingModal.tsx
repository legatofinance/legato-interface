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
import FormattedCurrencyAmount from '../FormattedCurrencyAmount'
import { useActiveWeb3React } from '../../hooks/web3'
import { t, Trans } from '@lingui/macro'
import { unwrappedToken } from '../../utils/unwrappedToken'

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

interface StakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: StakingInfo
}

export default function UnstakingModal({ isOpen, onDismiss, stakingInfo }: StakingModalProps) {
  const { account } = useActiveWeb3React()

  const token0 = stakingInfo?.stakedPairTokens?.[0]
  const token1 = stakingInfo?.stakedPairTokens?.[1]

  const currency0 = token0 ? unwrappedToken(token0) : undefined
  const currency1 = token1 ? unwrappedToken(token1) : undefined

  // monitor call to help UI loading state
  const addTransaction = useTransactionAdder()
  const [hash, setHash] = useState<string | undefined>()
  const [attempting, setAttempting] = useState(false)

  function wrappedOndismiss() {
    setHash(undefined)
    setAttempting(false)
    onDismiss()
  }

  const stakingContract = useStakingContract()

  async function onWithdraw() {
    if (stakingContract && stakingInfo?.stakedAmount && account) {
      setAttempting(true)
      await stakingContract
        .unstakeMyTokens(stakingInfo?.poolIndex)
        .then((response: TransactionResponse) => {
          addTransaction(response, {
            summary: t`Withdraw deposited liquidity`,
          })
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
    error = t`Connect a wallet`
  }
  if (!stakingInfo?.stakedAmount) {
    error = error ?? t`Enter an amount`
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOndismiss} maxHeight={90}>
      {!attempting && !hash && (
        <ContentWrapper gap="lg">
          <RowBetween>
            <TYPE.mediumHeader>
              <Trans>Withdraw</Trans>
            </TYPE.mediumHeader>
            <CloseIcon onClick={wrappedOndismiss} />
          </RowBetween>
          {stakingInfo?.stakedAmount && (
            <AutoColumn justify="center" gap="md">
              <TYPE.body fontWeight={600} fontSize={36}>
                {<FormattedCurrencyAmount currencyAmount={stakingInfo.stakedAmount} />}
              </TYPE.body>
              <TYPE.body>
                <Trans>
                  Deposited
                  {stakingInfo?.stakedPairTokens ? ' liquidity' : ' tokens'}:
                </Trans>
              </TYPE.body>
            </AutoColumn>
          )}
          {stakingInfo?.unclaimedAmount && (
            <AutoColumn justify="center" gap="md">
              <TYPE.body fontWeight={600} fontSize={36}>
                {<FormattedCurrencyAmount currencyAmount={stakingInfo?.unclaimedAmount} />}
              </TYPE.body>
              <TYPE.body>
                <Trans>Unclaimed {stakingInfo?.rewardToken.symbol}</Trans>
              </TYPE.body>
            </AutoColumn>
          )}
          {stakingInfo?.claimedAmount && (
            <AutoColumn justify="center" gap="md">
              <TYPE.body fontWeight={600} fontSize={36}>
                {<FormattedCurrencyAmount currencyAmount={stakingInfo?.claimedAmount} />}
              </TYPE.body>
              <TYPE.body>
                <Trans>Claimed {stakingInfo?.rewardToken.symbol}</Trans>
              </TYPE.body>
            </AutoColumn>
          )}
          <TYPE.subHeader style={{ textAlign: 'center' }}>
            <Trans>When you withdraw, your {stakingInfo?.rewardToken.symbol} is automatically retrieved</Trans>
          </TYPE.subHeader>
          <ButtonError disabled={!!error} error={!!error && !!stakingInfo?.stakedAmount} onClick={onWithdraw}>
            {error ?? <Trans>Withdraw & Retrieve</Trans>}
          </ButtonError>
        </ContentWrapper>
      )}
      {attempting && !hash && (
        <LoadingView onDismiss={wrappedOndismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.body fontSize={20}>
              <Trans>
                Withdrawing {stakingInfo?.stakedAmount?.toSignificant(4)}
                {currency0 && currency1
                  ? ` ${currency0.symbol}-${currency1.symbol}`
                  : ` ${stakingInfo?.stakedToken.symbol}`}
              </Trans>
            </TYPE.body>
            <TYPE.body fontSize={20}>
              <Trans>
                Retrieving {stakingInfo?.unclaimedAmount?.toSignificant(4)} {stakingInfo?.rewardToken.symbol}
              </Trans>
            </TYPE.body>
          </AutoColumn>
        </LoadingView>
      )}
      {hash && (
        <SubmittedView onDismiss={wrappedOndismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>
              <Trans>Transaction Submitted</Trans>
            </TYPE.largeHeader>
            <TYPE.body fontSize={20}>
              <Trans>
                Withdrew
                {currency0 && currency1
                  ? ` ${currency0.symbol}-${currency1.symbol}`
                  : ` ${stakingInfo?.stakedToken.symbol}`}
                !
              </Trans>
            </TYPE.body>
            <TYPE.body fontSize={20}>
              <Trans>Claimed LDOGE!</Trans>
            </TYPE.body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
