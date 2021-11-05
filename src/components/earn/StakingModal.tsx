import { useState, useCallback } from 'react'
import { Text } from 'rebass'
import { useV2LiquidityTokenPermit } from '../../hooks/useERC20Permit'
import { formatFixedCurrencyAmount } from '../../utils/formatCurrencyAmount'
import Modal from '../Modal'
import { AutoColumn } from '../Column'
import styled from 'styled-components/macro'
import { RowBetween } from '../Row'
import { TYPE, CloseIcon } from '../../theme'
import { ButtonPrimary, ButtonError } from '../Button'
import CurrencyInputPanel from '../CurrencyInputPanel'
import { Pair } from '@lambodoge/sdk'
import { Token, CurrencyAmount, Percent } from '@uniswap/sdk-core'
import { useActiveWeb3React } from '../../hooks/web3'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { usePairContract, useStakingRouterContract } from '../../hooks/useContract'
import { STAKING_ROUTER_ADDRESS } from 'constants/addresses'
import { useApproveCallback, ApprovalState } from '../../hooks/useApproveCallback'
import { StakingInfo, useDerivedStakeInfo } from '../../state/stake/hooks'
import { TransactionResponse } from '@ethersproject/providers'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { LoadingView, SubmittedView } from '../ModalViews'
import { t, Trans } from '@lingui/macro'
import { unwrappedToken } from '../../utils/unwrappedToken'
import { BIG_INT_SECONDS_IN_WEEK, NON_VIP_LEGATO_STAKE_V2_TAX, VIP_LEGATO_STAKE_V2_TAX } from '../../constants/misc'
import { calculateGasMargin } from '../../utils/calculateGasMargin'
import { LightCard } from '../Card'
import useTheme from 'hooks/useTheme'
import { useVipStatus } from 'hooks/useVip'
import { Dots } from 'pages/Pool/styleds'

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

  const stakedCurrencySymbol =
    currency0 && currency1 ? ` ${currency0.symbol}:${currency1.symbol}` : ` ${stakingInfo?.stakedToken.symbol}`

  // track and parse user input
  const [typedValue, setTypedValue] = useState('')
  const { parsedAmount, error } = useDerivedStakeInfo(
    typedValue,
    stakingInfo.stakedAmount.currency,
    userLiquidityUnstaked,
    stakedCurrencySymbol
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

  // txn values
  const [txHash, setTxHash] = useState<string>('')

  // state for pending and submitted txn views
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm

  // pair contract for this token to be staked
  const dummyPair = stakingInfo.stakedPairTokens
    ? new Pair(
        CurrencyAmount.fromRawAmount(stakingInfo.stakedPairTokens[0], '0'),
        CurrencyAmount.fromRawAmount(stakingInfo.stakedPairTokens[1], '0')
      )
    : undefined

  const wrappedOnDismiss = useCallback(() => {
    setTxHash('')
    setAttemptingTxn(false)
    onDismiss()
  }, [onDismiss, setTxHash, setAttemptingTxn])

  const stakingContract = useStakingRouterContract(stakingInfo)

  // approval data for stake
  const [approval, approveCallback] = useApproveCallback(
    parsedAmount,
    stakingInfo.address ?? (chainId ? STAKING_ROUTER_ADDRESS[chainId] : undefined)
  )

  const addTransaction = useTransactionAdder()

  const onStake = useCallback(async () => {
    if (!stakingContract) return
    if (approval !== ApprovalState.APPROVED) {
      setAttemptingTxn(false)
      throw new Error('Attempting to add reward without approval. Please contact support.')
    }

    const amount = parsedAmount?.quotient.toString()
    if (!amount) return

    const estimate = stakingContract.estimateGas.stakeTokens
    const method = stakingContract.stakeTokens
    let args: Array<string | string[] | number> = []

    if (stakingInfo.version === 1) {
      args = [stakingInfo.poolIndex, amount]
    } else if (stakingInfo.version === 2) {
      args = [amount]
    }

    setAttemptingTxn(true)
    await estimate(...args)
      .then((estimatedGasLimit) =>
        method(...args, {
          gasLimit: calculateGasMargin(estimatedGasLimit),
        }).then((response: any) => {
          addTransaction(response, {
            summary: t`Stake
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
  }, [approval, stakingContract, parsedAmount])

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

  const Buttons = () =>
    approval !== ApprovalState.APPROVED && !error ? (
      <ButtonPrimary onClick={approveCallback} disabled={approval === ApprovalState.PENDING}>
        {approval === ApprovalState.PENDING ? (
          <Dots>
            <Trans>Approving {stakedCurrencySymbol}</Trans>
          </Dots>
        ) : (
          <Trans>Approve {stakedCurrencySymbol}</Trans>
        )}
      </ButtonPrimary>
    ) : (
      <ButtonError onClick={onStake} disabled={!!error}>
        <Text fontWeight={500}>{error ? error : <Trans>Deposit</Trans>}</Text>
      </ButtonError>
    )

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOnDismiss} maxHeight={90}>
      {!attemptingTxn && !txHash && (
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
                  <Trans>Pool tax on deposit</Trans>
                </TYPE.black>
                <TYPE.black textAlign="right" fontSize={14} color={theme.text1}>
                  {stakingInfo.stakingTax.toFixed(0)}%
                </TYPE.black>
              </RowBetween>
            </AutoColumn>
          </LightCard>

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
                  .toFixed(6, { groupSeparator: ',' })}{' '}
                {stakingInfo?.rewardToken.symbol} / week
              </Trans>
            </TYPE.black>
          </HypotheticalRewardRate>

          <Buttons />
        </ContentWrapper>
      )}
      {attemptingTxn && !txHash && (
        <LoadingView onDismiss={wrappedOnDismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>
              <Trans>Depositing {stakingInfo?.stakedPairTokens ? 'Liquidity' : 'Tokens'}</Trans>
            </TYPE.largeHeader>
            <TYPE.body fontSize={20}>
              <Trans>
                {parsedAmount?.toFixed(6, { groupSeparator: ',' })}
                {stakedCurrencySymbol}
              </Trans>
            </TYPE.body>
          </AutoColumn>
        </LoadingView>
      )}
      {attemptingTxn && txHash && (
        <SubmittedView onDismiss={wrappedOnDismiss} hash={txHash}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>
              <Trans>Transaction Submitted</Trans>
            </TYPE.largeHeader>
            <TYPE.body fontSize={20}>
              <Trans>
                Deposited&nbsp;
                {parsedAmount?.toFixed(6, { groupSeparator: ',' })}
                {stakedCurrencySymbol}
              </Trans>
            </TYPE.body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}
