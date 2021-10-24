import React, { useCallback, useState, useMemo } from 'react'
import { t, Trans } from '@lingui/macro'
import { Text } from 'rebass'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import styled from 'styled-components/macro'
import { ArrowLeft } from 'react-feather'
import { Link as HistoryLink } from 'react-router-dom'
import JSBI from 'jsbi'

import { useV2StakeState, useV2StakeActionHandlers, useV2DerivedStakeInfo } from 'state/stake/v2/hooks'
import { Field } from '../../state/stake/v2/actions'
import { TYPE } from 'theme'
import useTheme from 'hooks/useTheme'
import {
  ScrollablePage,
  PageWrapper,
  PageHeader,
  Wrapper,
  ResponsiveTwoColumns,
  CurrencyDropdown,
  RightContainer,
  DynamicSection,
} from './styled'
import { ButtonText, ButtonLight, ButtonError, ButtonPrimary } from 'components/Button'
import { RowBetween } from 'components/Row'
import Column from 'components/Column'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { useUSDCValue } from '../../hooks/useUSDCPrice'
import Selector from 'components/Selector'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import HoverInlineText from 'components/HoverInlineText'
import InputStepCounter from 'components/InputStepCounter'
import { useActiveWeb3React } from 'hooks/web3'
import { useWalletModalToggle } from 'state/application/hooks'
import TransactionConfirmationModal, { ConfirmationModalContent } from '../../components/TransactionConfirmationModal'
import Review from './Review'
import {
  SP_MAKER_BNB_FEE,
  SP_MAKER_STAKING_TAX,
  SP_MAKER_UNSTAKING_TAX,
  SP_MAKER_PERIOD,
  BIG_INT_SECONDS_IN_DAY,
} from 'constants/misc'
import { useV2StakingContract } from '../../hooks/useContract'
import { calculateGasMargin } from '../../utils/calculateGasMargin'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { ApprovalState, useApproveCallback } from '../../hooks/useApproveCallback'
import { Dots } from '../Pool/styleds'

const StyledHistoryLink = styled(HistoryLink)<{ flex: string | undefined }>`
  flex: ${({ flex }) => flex ?? 'none'};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    flex: none;
    margin-right: 10px;
  `};
`

const StyledArrowLeft = styled(ArrowLeft)`
  color: ${({ theme }) => theme.text1};
`

export default function CreateStakingPool() {
  const { account } = useActiveWeb3React()
  const theme = useTheme()
  const toggleWalletModal = useWalletModalToggle() // toggle wallet when disconnected

  const [stakedCurrency, setStakedCurrency] = useState<Currency | null>(null)
  const [stakedCurrencyA, setStakedCurrencyA] = useState<Currency | null>(null)
  const [stakedCurrencyB, setStakedCurrencyB] = useState<Currency | null>(null)
  const [rewardCurrency, setRewardCurrency] = useState<Currency | null>(null)

  const [liquidityMining, setLiquidityMining] = useState(false)
  const [tax, setTax] = useState(false)

  // txn values
  const [txHash, setTxHash] = useState<string>('')

  // modal and loading
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm

  const handleStakedCurrencySelect = useCallback(
    (stakedCurrencyNew: Currency) => {
      setStakedCurrency(stakedCurrencyNew)
    },
    [setStakedCurrency]
  )

  const handleStakedCurrencyASelect = useCallback(
    (stakedCurrencyANew: Currency) => {
      setStakedCurrencyA(stakedCurrencyANew)
    },
    [setStakedCurrencyA]
  )

  const handleStakedCurrencyBSelect = useCallback(
    (stakedCurrencyBNew: Currency) => {
      setStakedCurrencyB(stakedCurrencyBNew)
    },
    [setStakedCurrencyB]
  )

  const handleRewardCurrencySelect = useCallback(
    (rewardCurrencyNew: Currency) => {
      setRewardCurrency(rewardCurrencyNew)
    },
    [setRewardCurrency]
  )

  // stake state
  const { typedRewardValue, typedMinimumStakedValue, typedMinimumTotalStakedValue } = useV2StakeState()

  const {
    onDepositRewardInput,
    onPoolLifespanInput,
    onMinimumStakedInput,
    onMinimumTotalStakedInput,
    onMinimumStakersInput,
  } = useV2StakeActionHandlers()

  const {
    currencyBalances,
    currencies,
    parsedAmounts,
    poolLifespan,
    currencyStaked,
    pairToStake,
    minimumStakers,
    errorMessage,
  } = useV2DerivedStakeInfo(
    liquidityMining,
    stakedCurrency ?? undefined,
    stakedCurrencyA ?? undefined,
    stakedCurrencyB ?? undefined,
    rewardCurrency ?? undefined
  )

  const isValid = !errorMessage

  // get formatted amounts
  const formattedAmounts = {
    [Field.CURRENCY_REWARD]: typedRewardValue,
    [Field.POOL_LIFESPAN]: parsedAmounts[Field.POOL_LIFESPAN]?.toSignificant(6, { groupSeparator: ',' }) ?? '',
    [Field.MINIMUM_STAKED]: typedMinimumStakedValue,
    [Field.MINIMUM_TOTAL_STAKED]: typedMinimumTotalStakedValue,
  }

  const usdcValues = {
    [Field.CURRENCY_REWARD]: useUSDCValue(parsedAmounts[Field.CURRENCY_REWARD]),
    [Field.POOL_LIFESPAN]: useUSDCValue(parsedAmounts[Field.POOL_LIFESPAN]),
    [Field.MINIMUM_STAKED]: useUSDCValue(parsedAmounts[Field.MINIMUM_STAKED]),
    [Field.MINIMUM_TOTAL_STAKED]: useUSDCValue(parsedAmounts[Field.MINIMUM_TOTAL_STAKED]),
  }

  // get the max amounts user can add
  const maxAmounts: { [field in Field]?: CurrencyAmount<Currency> } = [Field.CURRENCY_REWARD].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmountSpend(currencyBalances[field]),
      }
    },
    {}
  )

  const atMaxAmounts: { [field in Field]?: CurrencyAmount<Currency> } = [Field.CURRENCY_REWARD].reduce(
    (accumulator, field) => {
      return {
        ...accumulator,
        [field]: maxAmounts[field]?.equalTo(parsedAmounts[field] ?? '0'),
      }
    },
    {}
  )

  const handleLiquidityMiningSelect = useCallback(
    (newLiquidityMining: boolean) => {
      setLiquidityMining(newLiquidityMining)
    },
    [setLiquidityMining]
  )

  const handleTaxSelect = useCallback(
    (newTax: boolean) => {
      setTax(newTax)
    },
    [setTax]
  )

  const onPoolLifespanIncrement = useCallback(() => {
    onPoolLifespanInput(JSBI.add(poolLifespan, JSBI.BigInt('1')).toString())
  }, [onPoolLifespanInput, poolLifespan])

  const onPoolLifespanDecrement = useCallback(() => {
    onPoolLifespanInput(JSBI.subtract(poolLifespan, JSBI.BigInt('1')).toString())
  }, [onPoolLifespanInput, poolLifespan])

  const onMinimumStakersIncrement = useCallback(() => {
    onMinimumStakersInput(JSBI.add(minimumStakers, JSBI.BigInt('1')).toString())
  }, [onMinimumStakersInput, minimumStakers])

  const onMinimumStakersDecrement = useCallback(() => {
    onMinimumStakersInput(JSBI.subtract(minimumStakers, JSBI.BigInt('1')).toString())
  }, [onMinimumStakersInput, minimumStakers])

  const invalidStakingToken =
    (liquidityMining && (!currencies[Field.CURRENCY_STAKED_A] || !currencies[Field.CURRENCY_STAKED_B])) ||
    (!liquidityMining && !currencies[Field.CURRENCY_STAKED])

  const estimatedAPY = useMemo(() => {
    // APY = (reward per day * 365 / minStakers * (minStaked / minTotalStaked)) / minStaked * 100
    // APY = (reward per day * 365 / minStakers / minTotalStaked) * 100
    // APY = reward per day * 36500 / minStakers / minTotalStaked
    if (
      !usdcValues[Field.MINIMUM_TOTAL_STAKED] ||
      !usdcValues[Field.POOL_LIFESPAN] ||
      !minimumStakers ||
      JSBI.equal(minimumStakers, JSBI.BigInt(0)) ||
      usdcValues[Field.MINIMUM_TOTAL_STAKED]?.equalTo(0)
    ) {
      return undefined
    }
    return usdcValues?.[Field.POOL_LIFESPAN]
      ?.multiply(36500)
      ?.divide(minimumStakers ?? 1)
      ?.asFraction?.divide(usdcValues?.[Field.MINIMUM_TOTAL_STAKED] ?? 1)
  }, [usdcValues[Field.POOL_LIFESPAN], usdcValues[Field.MINIMUM_TOTAL_STAKED], minimumStakers])

  const onClear = useCallback(() => {
    setStakedCurrency(null)
    setStakedCurrencyA(null)
    setStakedCurrencyB(null)
    setRewardCurrency(null)
    setLiquidityMining(false)
    onDepositRewardInput('')
    onPoolLifespanInput('')
    onMinimumStakedInput('')
    onMinimumTotalStakedInput('')
    onMinimumStakersInput('')
  }, [
    setStakedCurrency,
    setStakedCurrencyA,
    setStakedCurrencyB,
    setRewardCurrency,
    setLiquidityMining,
    onDepositRewardInput,
    onPoolLifespanInput,
    onMinimumStakedInput,
    onMinimumTotalStakedInput,
    onMinimumStakersInput,
  ])

  const handleDismissConfirmation = useCallback(() => {
    setShowConfirm(false)
    // if there was a tx hash, we want to clear the input
    if (txHash) {
      onClear()
    }
    setTxHash('')
  }, [onClear, txHash])

  const v2StakingContract = useV2StakingContract()

  // check whether the user has approved the staking creator on the reward tokens
  const [approval, approveCallback] = useApproveCallback(
    parsedAmounts[Field.CURRENCY_REWARD],
    v2StakingContract?.address
  )

  const addTransaction = useTransactionAdder()

  const onCreate = useCallback(async () => {
    if (!v2StakingContract) return
    if (approval !== ApprovalState.APPROVED) {
      setAttemptingTxn(false)
      console.log(approval)
      throw new Error('Attempting to add reward without approval. Please contact support.')
    }

    const tokenStaked = currencyStaked?.wrapped
    const tokenReward = currencies[Field.CURRENCY_REWARD]?.wrapped
    const {
      [Field.CURRENCY_REWARD]: parsedRewardAmount,
      [Field.POOL_LIFESPAN]: rewardTokensPerDay,
      [Field.MINIMUM_STAKED]: minimumStaked,
      [Field.MINIMUM_TOTAL_STAKED]: minimumTotalStaked,
    } = parsedAmounts
    if (
      !tokenStaked ||
      !tokenReward ||
      !parsedRewardAmount ||
      !rewardTokensPerDay ||
      !minimumStakers ||
      !minimumStaked ||
      !minimumTotalStaked
    )
      return

    const estimate = v2StakingContract.estimateGas.createNewPoolAndPayBNBAndAddReward
    const method = v2StakingContract.createNewPoolAndPayBNBAndAddReward
    const args = [
      {
        stakedToken: tokenStaked.address,
        rewardToken: tokenReward.address,
        stakeTax: tax ? SP_MAKER_STAKING_TAX.toFixed(0) : 0,
        unstakeTax: tax ? SP_MAKER_UNSTAKING_TAX.toFixed(0) : 0,
        unstakeRewardTax: tax ? SP_MAKER_UNSTAKING_TAX.toFixed(0) : 0,
        stakePeriod: SP_MAKER_PERIOD.toString(),
        rewardTokensByPeriod: rewardTokensPerDay
          .divide(BIG_INT_SECONDS_IN_DAY)
          .multiply(SP_MAKER_PERIOD)
          .quotient.toString(),
        minTotalStakedForFullReward: minimumTotalStaked.quotient.toString(),
        minStakersForFullReward: minimumStakers.toString(),
        minUserStakesForReward: minimumStaked.quotient.toString(),
        minStakeTime: 0,
        keepTax: false,
      },
      parsedRewardAmount.quotient.toString(),
    ]
    const value = SP_MAKER_BNB_FEE.quotient.toString()

    console.log('HEY2')

    setAttemptingTxn(true)
    await estimate(...args, value ? { value } : {})
      .then((estimatedGasLimit) =>
        method(...args, {
          ...(value ? { value } : {}),
          gasLimit: calculateGasMargin(estimatedGasLimit),
        }).then((response: any) => {
          setAttemptingTxn(false)

          addTransaction(response, {
            summary: t`Create
            ${pairToStake ? `${pairToStake.token0.symbol}:${pairToStake.token1.symbol}` : currencyStaked?.symbol} /
            ${currencies[Field.CURRENCY_REWARD]?.symbol} staking pool`,
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
  }, [])

  // TODO: more details in the pendingText
  const pendingText = `Creating staking pool`

  const Buttons = () =>
    !account ? (
      <ButtonLight onClick={toggleWalletModal} $borderRadius="12px" padding={'12px'}>
        <Trans>Connect Wallet</Trans>
      </ButtonLight>
    ) : approval !== ApprovalState.APPROVED && isValid ? (
      <ButtonPrimary onClick={approveCallback} disabled={approval === ApprovalState.PENDING}>
        {approval === ApprovalState.PENDING ? (
          <Dots>
            <Trans>Approving {currencies[Field.CURRENCY_REWARD]?.symbol}</Trans>
          </Dots>
        ) : (
          <Trans>Approve {currencies[Field.CURRENCY_REWARD]?.symbol}</Trans>
        )}
      </ButtonPrimary>
    ) : (
      <ButtonError
        onClick={() => {
          setShowConfirm(true)
        }}
        disabled={!isValid}
      >
        <Text fontWeight={500}>{errorMessage ? errorMessage : <Trans>Create pool</Trans>}</Text>
      </ButtonError>
    )

  return (
    <ScrollablePage>
      <TransactionConfirmationModal
        isOpen={showConfirm}
        onDismiss={handleDismissConfirmation}
        attemptingTxn={attemptingTxn}
        hash={txHash}
        content={() => (
          <ConfirmationModalContent
            title={<Trans>Create staking pool</Trans>}
            onDismiss={handleDismissConfirmation}
            topContent={() => (
              <Review
                currencyStaked={currencyStaked}
                currencyReward={currencies[Field.CURRENCY_REWARD]}
                pairToStake={pairToStake}
                totalRewardAmount={parsedAmounts[Field.CURRENCY_REWARD]}
                minimumToStake={parsedAmounts[Field.MINIMUM_STAKED]}
                minimumTotalStaked={parsedAmounts[Field.MINIMUM_TOTAL_STAKED]}
                minimumStakers={minimumStakers}
                poolLifespan={poolLifespan}
                tax={tax}
              />
            )}
            bottomContent={() => (
              <ButtonPrimary style={{ marginTop: '1rem' }} onClick={onCreate}>
                <Text fontWeight={500} fontSize={20}>
                  <Trans>Confirm pool creation</Trans>
                </Text>
              </ButtonPrimary>
            )}
          />
        )}
        pendingText={pendingText}
      />
      <PageWrapper wide={true}>
        <PageHeader>
          <StyledHistoryLink to="/stake" flex={undefined}>
            <StyledArrowLeft stroke={theme.text2} />
          </StyledHistoryLink>
          <TYPE.mediumHeader fontWeight={500} fontSize={20} style={{ flex: '1', margin: 'auto', textAlign: 'center' }}>
            SP Maker
          </TYPE.mediumHeader>
          <ButtonText onClick={onClear} margin="0 15px 0 0">
            <TYPE.blue fontSize="12px">Clear All</TYPE.blue>
          </ButtonText>
        </PageHeader>
        <Wrapper>
          <ResponsiveTwoColumns wide={true}>
            <Column gap="md" justify="space-between">
              <RowBetween paddingBottom="20px">
                <TYPE.label>Staking token</TYPE.label>
              </RowBetween>

              <RowBetween>
                <CurrencyDropdown
                  value="0"
                  // eslint-disable-next-line @typescript-eslint/no-empty-function
                  onUserInput={(value) => {}}
                  hideInput={true}
                  onCurrencySelect={liquidityMining ? handleStakedCurrencyASelect : handleStakedCurrencySelect}
                  showMaxButton={false}
                  currency={
                    (liquidityMining ? currencies[Field.CURRENCY_STAKED_A] : currencies[Field.CURRENCY_STAKED]) ?? null
                  }
                  id="sp-maker-staked-token"
                  showCommonBases
                />

                <div style={{ width: '12px' }} />

                {liquidityMining && (
                  <CurrencyDropdown
                    value="0"
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                    onUserInput={(value) => {}}
                    hideInput={true}
                    onCurrencySelect={handleStakedCurrencyBSelect}
                    showMaxButton={false}
                    currency={currencies[Field.CURRENCY_STAKED_B] ?? null}
                    id="sp-make-reward-token"
                    showCommonBases
                  />
                )}
              </RowBetween>

              <Selector
                selected={liquidityMining}
                handleSelection={handleLiquidityMiningSelect}
                titles={['Classic staking', 'Liquidity mining']}
                descriptions={['Incentivize holding', 'Incentivize liquidity providing']}
              />

              <RowBetween paddingBottom="20px">
                <TYPE.label>Reward token</TYPE.label>
              </RowBetween>

              <RowBetween>
                <CurrencyDropdown
                  value="0"
                  // eslint-disable-next-line @typescript-eslint/no-empty-function
                  onUserInput={(value) => {}}
                  hideInput={true}
                  onCurrencySelect={handleRewardCurrencySelect}
                  showMaxButton={false}
                  currency={currencies[Field.CURRENCY_REWARD] ?? null}
                  id="sp-make-reward-token"
                  showCommonBases
                />
              </RowBetween>
            </Column>

            <DynamicSection disabled={!currencies[Field.CURRENCY_REWARD]}>
              <Column gap="md" justify="space-between">
                <RowBetween paddingBottom="20px">
                  <TYPE.label>Total amount of tokens to distribute</TYPE.label>
                </RowBetween>

                <CurrencyInputPanel
                  value={formattedAmounts[Field.CURRENCY_REWARD]}
                  onUserInput={onDepositRewardInput}
                  onMax={() => {
                    onDepositRewardInput(maxAmounts[Field.CURRENCY_REWARD]?.toExact() ?? '')
                  }}
                  showMaxButton={!atMaxAmounts[Field.CURRENCY_REWARD]}
                  currency={currencies[Field.CURRENCY_REWARD] ?? null}
                  id="sp-maker-reward-input-token"
                  fiatValue={usdcValues[Field.CURRENCY_REWARD]}
                  showCommonBases
                />

                <RowBetween paddingBottom="20px">
                  <TYPE.label>Reward distribution</TYPE.label>
                </RowBetween>

                <InputStepCounter
                  value={JSBI.equal(poolLifespan, JSBI.BigInt(0)) ? '' : poolLifespan.toString()}
                  onUserInput={onPoolLifespanInput}
                  placeholder="0"
                  onDecrement={onPoolLifespanDecrement}
                  decrementDisabled={JSBI.equal(poolLifespan, JSBI.BigInt('0'))}
                  onIncrement={onPoolLifespanIncrement}
                  incrementDisabled={false}
                >
                  <TYPE.label fontSize={14} fontWeight={400} color={theme.text2} textAlign="center">
                    Pool minimum lifespan in days
                  </TYPE.label>
                </InputStepCounter>

                <TYPE.body
                  fontSize={14}
                  color={usdcValues[Field.POOL_LIFESPAN] ? theme.text1 : theme.text4}
                  textAlign="center"
                >
                  maximum distributed per day:
                  {usdcValues[Field.POOL_LIFESPAN] ? (
                    <>
                      <br />
                      <strong style={{ color: theme.primaryText1, fontSize: '16px', lineHeight: '30px' }}>
                        {formattedAmounts[Field.POOL_LIFESPAN]}
                        {` ${currencies[Field.CURRENCY_REWARD]?.symbol} `}
                        <span style={{ color: theme.text2 }}>~$&nbsp;</span>
                        <HoverInlineText
                          text={usdcValues[Field.POOL_LIFESPAN]?.toSignificant(6, { groupSeparator: ',' })}
                        />
                      </strong>
                    </>
                  ) : (
                    <>
                      <br />
                      <span style={{ fontSize: '16px', lineHeight: '30px' }}>-</span>
                    </>
                  )}
                </TYPE.body>
              </Column>
            </DynamicSection>

            <RightContainer>
              <DynamicSection gap="md" disabled={invalidStakingToken}>
                <RowBetween paddingBottom="20px">
                  <TYPE.label>Minimum to stake</TYPE.label>
                </RowBetween>

                <CurrencyInputPanel
                  value={formattedAmounts[Field.MINIMUM_STAKED]}
                  onUserInput={onMinimumStakedInput}
                  showMaxButton={false}
                  hideBalance={true}
                  currency={currencyStaked ?? null}
                  id="sp-maker-minimum-staked"
                  fiatValue={usdcValues[Field.MINIMUM_STAKED]}
                  pair={pairToStake ?? null}
                  showCommonBases
                />

                <RowBetween paddingBottom="20px">
                  <TYPE.label>Minimum total staked for full rewards</TYPE.label>
                </RowBetween>

                <CurrencyInputPanel
                  value={formattedAmounts[Field.MINIMUM_TOTAL_STAKED]}
                  onUserInput={onMinimumTotalStakedInput}
                  showMaxButton={false}
                  hideBalance={true}
                  currency={currencyStaked ?? null}
                  id="sp-maker-minimum-total-staked"
                  fiatValue={usdcValues[Field.MINIMUM_TOTAL_STAKED]}
                  pair={pairToStake ?? null}
                  showCommonBases
                />

                <RowBetween paddingBottom="20px">
                  <TYPE.label>Minimum number of stakers for full rewards</TYPE.label>
                </RowBetween>

                <InputStepCounter
                  value={JSBI.equal(minimumStakers, JSBI.BigInt(0)) ? '' : minimumStakers.toString()}
                  onUserInput={onMinimumStakersInput}
                  placeholder="0"
                  onDecrement={onMinimumStakersDecrement}
                  decrementDisabled={JSBI.equal(minimumStakers, JSBI.BigInt('0'))}
                  onIncrement={onMinimumStakersIncrement}
                  incrementDisabled={false}
                />

                <TYPE.body fontSize={14} color={estimatedAPY ? theme.text1 : theme.text4} textAlign="center">
                  estimated APY at launch:
                  {estimatedAPY ? (
                    <>
                      <br />
                      <strong style={{ color: theme.primaryText1, fontSize: '24px', lineHeight: '36px' }}>
                        {estimatedAPY.toFixed(2)} %
                      </strong>
                    </>
                  ) : (
                    <>
                      <br />
                      <span style={{ fontSize: '16px', lineHeight: '36px' }}>-</span>
                    </>
                  )}
                </TYPE.body>

                <RowBetween paddingBottom="20px">
                  <TYPE.label>Tax on stake/unstake</TYPE.label>
                </RowBetween>

                <Selector
                  selected={tax}
                  handleSelection={handleTaxSelect}
                  titles={['No tax', `${SP_MAKER_STAKING_TAX.toFixed(0)}% / ${SP_MAKER_UNSTAKING_TAX.toFixed(0)}%`]}
                  descriptions={['Better for low APYs', 'Incentivize holding more']}
                />
              </DynamicSection>

              <Column gap="md" style={{ marginTop: '20px' }}>
                <Buttons />

                <TYPE.body fontSize={14} color={theme.text1} textAlign="center">
                  Pool creation fee: <strong>{SP_MAKER_BNB_FEE.toFixed(2)} BNB</strong>
                </TYPE.body>
              </Column>
            </RightContainer>
          </ResponsiveTwoColumns>
        </Wrapper>
      </PageWrapper>
    </ScrollablePage>
  )
}
