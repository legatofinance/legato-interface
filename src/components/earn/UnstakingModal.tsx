import { useState, useCallback } from 'react'
import { Percent } from '@uniswap/sdk-core'
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
import FormattedCurrencyAmount from '../FormattedCurrencyAmount'
import { useActiveWeb3React } from '../../hooks/web3'
import { t, Trans } from '@lingui/macro'
import { unwrappedToken } from '../../utils/unwrappedToken'
import { calculateGasMargin } from '../../utils/calculateGasMargin'
import { LightCard } from '../Card'
import useTheme from 'hooks/useTheme'
import { NON_VIP_LEGATO_STAKE_V2_TAX, VIP_LEGATO_STAKE_V2_TAX } from '../../constants/misc'
import { useVipStatus } from 'hooks/useVip'

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
  const theme = useTheme()
  const vipStatus = useVipStatus()

  let legatoTax = new Percent('0')
  if (stakingInfo.version === 2) {
    legatoTax = vipStatus ? VIP_LEGATO_STAKE_V2_TAX : NON_VIP_LEGATO_STAKE_V2_TAX
  }

  const token0 = stakingInfo?.stakedPairTokens?.[0]
  const token1 = stakingInfo?.stakedPairTokens?.[1]

  const currency0 = token0 ? unwrappedToken(token0) : undefined
  const currency1 = token1 ? unwrappedToken(token1) : undefined

  // monitor call to help UI loading state
  const addTransaction = useTransactionAdder()
  const [txHash, setTxHash] = useState<string | undefined>()
  const [attemptingTxn, setAttemptingTxn] = useState(false)

  function wrappedOndismiss() {
    setTxHash(undefined)
    setAttemptingTxn(false)
    onDismiss()
  }

  const stakingContract = useStakingRouterContract(stakingInfo)

  const onWithdraw = useCallback(async () => {
    if (!stakingContract) return

    const estimate = stakingContract.estimateGas.unstakeMyTokens
    const method = stakingContract.unstakeMyTokens
    let args: Array<string | string[] | number> = []

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
            summary: t`Withdraw
            ${currency0 && currency1 ? `${currency0.symbol}:${currency1.symbol}` : stakingInfo.stakedToken.symbol}`,
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
  }, [stakingContract])

  let error: string | undefined
  if (!account) {
    error = t`Connect a wallet`
  }
  if (!stakingInfo?.stakedAmount) {
    error = error ?? t`Enter an amount`
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOndismiss} maxHeight={90}>
      {!attemptingTxn && !txHash && (
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

          <LightCard>
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
                  <Trans>Legato tax {!vipStatus && !legatoTax.equalTo('0') ? "(you're not VIP)" : ''}</Trans>
                </TYPE.black>
                <TYPE.black textAlign="right" fontSize={14} color={theme.text1}>
                  {legatoTax.toFixed(0)}%
                </TYPE.black>
              </RowBetween>

              <RowBetween>
                <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
                  <Trans>Pool tax on retrieve</Trans>
                </TYPE.black>
                <TYPE.black textAlign="right" fontSize={14} color={theme.text1}>
                  {stakingInfo.retrievingTax.toFixed(0)}%
                </TYPE.black>
              </RowBetween>

              <RowBetween>
                <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
                  <Trans>Pool tax on withdraw</Trans>
                </TYPE.black>
                <TYPE.black textAlign="right" fontSize={14} color={theme.text1}>
                  {stakingInfo.unstakingTax.toFixed(0)}%
                </TYPE.black>
              </RowBetween>
            </AutoColumn>
          </LightCard>

          <ButtonError disabled={!!error} error={!!error && !!stakingInfo?.stakedAmount} onClick={onWithdraw}>
            {error ?? <Trans>Retrieve & Withdraw</Trans>}
          </ButtonError>
        </ContentWrapper>
      )}
      {attemptingTxn && !txHash && (
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
      {txHash && (
        <SubmittedView onDismiss={wrappedOndismiss} hash={txHash}>
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
