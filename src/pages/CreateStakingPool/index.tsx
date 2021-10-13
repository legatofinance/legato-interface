import React, { useCallback, useState } from 'react'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import styled from 'styled-components/macro'
import { darken } from 'polished'
import { ArrowLeft } from 'react-feather'
import { Link as HistoryLink } from 'react-router-dom'
import { Plus, Minus } from 'react-feather'
import JSBI from 'jsbi'

import { useV2StakeState, useV2StakeActionHandlers, useV2DerivedStakeInfo } from 'state/stake/v2/hooks'
import { Field } from '../../state/stake/v2/actions'
import { TYPE } from 'theme'
import useTheme from 'hooks/useTheme'
import {
  PageWrapper,
  PageHeader,
  Wrapper,
  ResponsiveTwoColumns,
  CurrencyDropdown,
  RightContainer,
  DynamicSection,
} from './styled'
import { ButtonText, ButtonGray } from 'components/Button'
import { RowBetween } from 'components/Row'
import { AutoColumn } from 'components/Column'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { useUSDCValue } from '../../hooks/useUSDCPrice'
import LiquidityMiningSelector from 'components/LiquidityMiningSelector'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import { Input as NumericalInput } from 'components/NumericalInput'
import HoverInlineText from 'components/HoverInlineText'

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

const StyledInput = styled(RowBetween)`
  padding: 12px 16px;
  border: solid 1px ${({ theme }) => theme.bg2};
  background: ${({ theme }) => theme.bg1};
  border-radius: 20px;
  gap: 32px;

  & input {
    min-height: 2.4rem;
    width: 100%;
    background: transparent;
  }
`

const LabelRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  color: ${({ theme }) => theme.text1};
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0 1rem 1rem;
  span:hover {
    cursor: pointer;
    color: ${({ theme }) => darken(0.2, theme.text2)};
  }
`

const FiatRow = styled(LabelRow)`
  justify-content: flex-end;
`

const InputRow = styled.div`
  display: grid;
  grid-template-columns: 30px 1fr 30px;
`

const SmallButton = styled(ButtonGray)<{ disabled: boolean }>`
  background-color: ${({ disabled, theme }) => (disabled ? theme.bg0 : theme.primary1)};
  border-radius: 8px;
  padding: 4px;

  &:hover {
    background-color: ${({ disabled, theme }) => (disabled ? theme.bg0 : darken(0.05, theme.primary1))};
  }
`

export default function CreateStakingPool() {
  const theme = useTheme()

  const [stakedCurrency, setStakedCurrency] = useState<Currency | null>(null)
  const [stakedCurrencyA, setStakedCurrencyA] = useState<Currency | null>(null)
  const [stakedCurrencyB, setStakedCurrencyB] = useState<Currency | null>(null)
  const [rewardCurrency, setRewardCurrency] = useState<Currency | null>(null)

  const [liquidityMining, setLiquidityMining] = useState(false)

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
  const { typedRewardValue, typedPoolLifespanValue } = useV2StakeState()

  const { onDepositRewardInput, onPoolLifespanInput } = useV2StakeActionHandlers()

  const { currencyBalances, currencies, parsedAmounts, poolLifespan } = useV2DerivedStakeInfo(
    stakedCurrency ?? undefined,
    stakedCurrencyA ?? undefined,
    stakedCurrencyB ?? undefined,
    rewardCurrency ?? undefined
  )

  // get formatted amounts
  const formattedAmounts = {
    [Field.CURRENCY_REWARD]: typedRewardValue,
    [Field.POOL_LIFESPAN]: parsedAmounts[Field.POOL_LIFESPAN]?.toSignificant(6) ?? '',
  }

  const usdcValues = {
    [Field.CURRENCY_REWARD]: useUSDCValue(parsedAmounts[Field.CURRENCY_REWARD]),
    [Field.POOL_LIFESPAN]: useUSDCValue(parsedAmounts[Field.POOL_LIFESPAN]),
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

  const onPoolLifespanIncrement = () => {
    onPoolLifespanInput(JSBI.add(poolLifespan, JSBI.BigInt('1')).toString())
  }

  const onPoolLifespanDecrement = () => {
    onPoolLifespanInput(JSBI.subtract(poolLifespan, JSBI.BigInt('1')).toString())
  }

  const clearAll = useCallback(() => {
    setStakedCurrency(null)
    setStakedCurrencyA(null)
    setStakedCurrencyB(null)
    setRewardCurrency(null)
    setLiquidityMining(false)
    onDepositRewardInput('')
    onPoolLifespanInput('')
  }, [
    setStakedCurrency,
    setStakedCurrencyA,
    setStakedCurrencyB,
    setRewardCurrency,
    setLiquidityMining,
    onDepositRewardInput,
    onPoolLifespanInput,
  ])

  return (
    <PageWrapper wide={true}>
      <PageHeader>
        <StyledHistoryLink to="/stake" flex={undefined}>
          <StyledArrowLeft stroke={theme.text2} />
        </StyledHistoryLink>
        <TYPE.mediumHeader fontWeight={500} fontSize={20} style={{ flex: '1', margin: 'auto', textAlign: 'center' }}>
          SP Maker
        </TYPE.mediumHeader>
        <ButtonText onClick={clearAll} margin="0 15px 0 0">
          <TYPE.blue fontSize="12px">Clear All</TYPE.blue>
        </ButtonText>
      </PageHeader>
      <Wrapper>
        <ResponsiveTwoColumns wide={true}>
          <AutoColumn gap="md">
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

            <LiquidityMiningSelector
              liquidityMining={liquidityMining}
              handleLiquidityMiningSelect={handleLiquidityMiningSelect}
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
          </AutoColumn>

          <DynamicSection disabled={!currencies[Field.CURRENCY_REWARD]}>
            <AutoColumn gap="md">
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
                id="sp-make-reward-input-token"
                fiatValue={usdcValues[Field.CURRENCY_REWARD]}
                showCommonBases
              />

              <RowBetween paddingBottom="20px">
                <TYPE.label>Reward distribution</TYPE.label>
              </RowBetween>

              <StyledInput>
                <TYPE.label fontSize={14} fontWeight={400} color={theme.text2} textAlign="center">
                  Pool minimum lifespan in days
                </TYPE.label>

                <InputRow>
                  <SmallButton onClick={onPoolLifespanDecrement} disabled={JSBI.equal(poolLifespan, JSBI.BigInt('0'))}>
                    <TYPE.white fontSize="12px">
                      <Minus size={18} />
                    </TYPE.white>
                  </SmallButton>

                  <NumericalInput
                    align="center"
                    className="reward-token-amount-period-input"
                    value={JSBI.equal(poolLifespan, JSBI.BigInt(0)) ? '' : poolLifespan.toString()}
                    onUserInput={onPoolLifespanInput}
                    placeholder="0"
                  />

                  <SmallButton onClick={onPoolLifespanIncrement} disabled={false}>
                    <TYPE.white fontSize="12px">
                      <Plus size={18} />
                    </TYPE.white>
                  </SmallButton>
                </InputRow>
              </StyledInput>

              <TYPE.body
                fontSize={14}
                color={usdcValues[Field.POOL_LIFESPAN] ? theme.text1 : theme.text4}
                textAlign="center"
                style={{ lineHeight: '20px' }}
              >
                distributed per day:
                {usdcValues[Field.POOL_LIFESPAN] ? (
                  <>
                    <br />
                    {formattedAmounts[Field.POOL_LIFESPAN]}
                    {` ${currencies[Field.CURRENCY_REWARD]?.symbol} `}
                    <span style={{ color: theme.text2 }}>~$&nbsp;</span>
                    <HoverInlineText
                      text={usdcValues[Field.POOL_LIFESPAN]?.toSignificant(6, { groupSeparator: ',' })}
                    />
                  </>
                ) : (
                  ''
                )}
              </TYPE.body>
            </AutoColumn>
          </DynamicSection>

          <RightContainer gap="md">
            <RowBetween paddingBottom="20px">
              <TYPE.label>Adjust settings</TYPE.label>
            </RowBetween>
          </RightContainer>
        </ResponsiveTwoColumns>
      </Wrapper>
    </PageWrapper>
  )
}
