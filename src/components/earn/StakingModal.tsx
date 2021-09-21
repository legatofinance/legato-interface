import { useState, useCallback } from 'react'
import { useV2LiquidityTokenPermit } from '../../hooks/useERC20Permit'
import useTransactionDeadline from '../../hooks/useTransactionDeadline'
import { formatFixedCurrencyAmount } from '../../utils/formatCurrencyAmount'
import Modal from '../Modal'
import { AutoColumn } from '../Column'
import styled from 'styled-components/macro'
import { RowBetween } from '../Row'
import { TYPE, CloseIcon } from '../../theme'
import { ButtonConfirmed, ButtonError } from '../Button'
import ProgressCircles from '../ProgressSteps'
import CurrencyInputPanel from '../CurrencyInputPanel'
import { Pair } from '@lambodoge/sdk'
import { Token, CurrencyAmount } from '@uniswap/sdk-core'
import { useActiveWeb3React } from '../../hooks/web3'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { usePairContract, useStakingContract, useV2RouterContract } from '../../hooks/useContract'
import { STAKING_ROUTER_ADDRESS } from 'constants/addresses'
import { useApproveCallback, ApprovalState } from '../../hooks/useApproveCallback'
import { StakingInfo, useDerivedStakeInfo } from '../../state/stake/hooks'
import { TransactionResponse } from '@ethersproject/providers'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { LoadingView, SubmittedView } from '../ModalViews'
import { t, Trans } from '@lingui/macro'
import { unwrappedToken } from '../../utils/unwrappedToken'
import { BIG_INT_SECONDS_IN_WEEK } from '../../constants/misc'

const HypotheticalRewardRate = styled.div<{ dim: boolean }>`
  display: flex;
  justify-content: space-between;
  padding-right: 20px;
  padding-left: 20px;

  opacity: ${({ dim }) => (dim ? 1 : 1)};
`

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

interface StakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: StakingInfo
  userLiquidityUnstaked: CurrencyAmount<Token> | undefined
}

export default function StakingModal({ isOpen, onDismiss, stakingInfo, userLiquidityUnstaked }: StakingModalProps) {
  const { chainId, library } = useActiveWeb3React()

  const token0 = stakingInfo?.stakedPairTokens?.[0]
  const token1 = stakingInfo?.stakedPairTokens?.[1]

  const currency0 = token0 ? unwrappedToken(token0) : undefined
  const currency1 = token1 ? unwrappedToken(token1) : undefined

  // track and parse user input
  const [typedValue, setTypedValue] = useState('')
  const { parsedAmount, error } = useDerivedStakeInfo(
    typedValue,
    stakingInfo.stakedAmount.currency,
    userLiquidityUnstaked
  )
  const parsedAmountWrapped = parsedAmount?.wrapped

  let hypotheticalRewardRate: CurrencyAmount<Token> = CurrencyAmount.fromRawAmount(stakingInfo.rewardRate.currency, '0')
  if (parsedAmountWrapped?.greaterThan('0')) {
    hypotheticalRewardRate = stakingInfo.getHypotheticalRewardRate(
      stakingInfo.rewardToken,
      stakingInfo.stakedAmount.add(parsedAmountWrapped),
      stakingInfo.totalStakedAmount.add(parsedAmountWrapped),
      stakingInfo.totalRewardRate
    )
  }

  // state for pending and submitted txn views
  const addTransaction = useTransactionAdder()
  const [attempting, setAttempting] = useState<boolean>(false)
  const [hash, setHash] = useState<string | undefined>()
  const wrappedOnDismiss = useCallback(() => {
    setHash(undefined)
    setAttempting(false)
    onDismiss()
  }, [onDismiss])

  // pair contract for this token to be staked
  const dummyPair = stakingInfo.stakedPairTokens
    ? new Pair(
        CurrencyAmount.fromRawAmount(stakingInfo.stakedPairTokens[0], '0'),
        CurrencyAmount.fromRawAmount(stakingInfo.stakedPairTokens[1], '0')
      )
    : undefined

  // approval data for stake
  const deadline = useTransactionDeadline()
  const [approval, approveCallback] = useApproveCallback(
    parsedAmount,
    chainId ? STAKING_ROUTER_ADDRESS[chainId] : undefined
  )

  const stakingContract = useStakingContract()
  async function onStake() {
    setAttempting(true)
    if (stakingContract && parsedAmount && deadline) {
      if (approval === ApprovalState.APPROVED) {
        stakingContract
          .stakeTokens(stakingInfo.poolIndex, `0x${parsedAmount.quotient.toString(16)}`)
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              summary: t`Deposit liquidity`,
            })
            setHash(response.hash)
          })
          .catch((error: any) => {
            setAttempting(false)
            console.log(error)
          })
      } else {
        setAttempting(false)
        throw new Error('Attempting to stake without approval. Please contact support.')
      }
    }
  }

  // wrapped onUserInput to clear signatures
  const onUserInput = useCallback((typedValue: string) => {
    setTypedValue(typedValue)
  }, [])

  // used for max input button
  const maxAmountInput = maxAmountSpend(userLiquidityUnstaked)
  const atMaxAmount = Boolean(maxAmountInput && parsedAmount?.equalTo(maxAmountInput))
  const handleMax = useCallback(() => {
    maxAmountInput && onUserInput(maxAmountInput.toExact())
  }, [maxAmountInput, onUserInput])

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attempting && !hash && (
        <ContentWrapper gap="lg">
          <RowBetween>
            <TYPE.mediumHeader>
              <Trans>Deposit</Trans>
            </TYPE.mediumHeader>
            <CloseIcon onClick={wrappedOnDismiss} />
          </RowBetween>
          <CurrencyInputPanel
            value={typedValue}
            onUserInput={onUserInput}
            onMax={handleMax}
            showMaxButton={!atMaxAmount}
            currency={stakingInfo.stakedAmount.currency}
            pair={dummyPair}
            label={''}
            renderBalance={(amount) => <Trans>Available to deposit: {formatFixedCurrencyAmount(amount, 4)}</Trans>}
            id="stake-liquidity-token"
          />

          <HypotheticalRewardRate dim={!hypotheticalRewardRate.greaterThan('0')}>
            <div>
              <TYPE.black fontWeight={600}>
                <Trans>Weekly Rewards</Trans>
              </TYPE.black>
            </div>

            <TYPE.black>
              <Trans>
                {hypotheticalRewardRate
                  .multiply(BIG_INT_SECONDS_IN_WEEK.toString())
                  .toSignificant(4, { groupSeparator: ',' })}{' '}
                {currency0 && currency1
                  ? `${currency0.symbol}-${currency1.symbol}`
                  : `${stakingInfo?.stakedToken.symbol}`}{' '}
                / week
              </Trans>
            </TYPE.black>
          </HypotheticalRewardRate>

          <RowBetween>
            <ButtonConfirmed
              mr="0.5rem"
              onClick={approveCallback}
              confirmed={approval === ApprovalState.APPROVED}
              disabled={approval !== ApprovalState.NOT_APPROVED}
            >
              <Trans>Approve</Trans>
            </ButtonConfirmed>
            <ButtonError
              disabled={!!error || approval !== ApprovalState.APPROVED}
              error={!!error && !!parsedAmount}
              onClick={onStake}
            >
              {error ?? <Trans>Deposit</Trans>}
            </ButtonError>
          </RowBetween>
          <ProgressCircles steps={[approval === ApprovalState.APPROVED]} disabled={true} />
        </ContentWrapper>
      )}
      {attempting && !hash && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>
              <Trans>Depositing {stakingInfo?.stakedPairTokens ? 'Liquidity' : 'Tokens'}</Trans>
            </TYPE.largeHeader>
            <TYPE.body fontSize={20}>
              <Trans>
                {parsedAmount?.toFixed(18)}
                {currency0 && currency1
                  ? ` ${currency0.symbol}-${currency1.symbol}`
                  : ` ${stakingInfo?.stakedToken.symbol}`}
              </Trans>
            </TYPE.body>
          </AutoColumn>
        </LoadingView>
      )}
      {attempting && hash && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>
              <Trans>Transaction Submitted</Trans>
            </TYPE.largeHeader>
            <TYPE.body fontSize={20}>
              <Trans>
                Deposited&nbsp;
                {parsedAmount?.toSignificant(4)}
                {currency0 && currency1
                  ? ` ${currency0.symbol}-${currency1.symbol}`
                  : ` ${stakingInfo?.stakedToken.symbol}`}
              </Trans>
            </TYPE.body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
