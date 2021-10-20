import { useMemo } from 'react'
import styled from 'styled-components/macro'
import { Trans } from '@lingui/macro'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { Pair } from '@lambodoge/sdk'
import JSBI from 'jsbi'

import { ButtonPrimary } from '../../components/Button'
import { AutoColumn } from 'components/Column'
import { LightCard } from 'components/Card'
import { RowBetween, RowFixed } from 'components/Row'
import { TYPE } from 'theme'
import CurrencyLogo from 'components/CurrencyLogo'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import useTheme from 'hooks/useTheme'
import { WETH9_EXTENDED } from 'constants/tokens'
import { useActiveWeb3React } from 'hooks/web3'
import { SP_MAKER_BNB_FEE, SP_MAKER_STAKING_TAX, SP_MAKER_UNSTAKING_TAX } from 'constants/misc'

const Wrapper = styled.div`
  padding-top: 12px;
`

export default function Review({
  currencyStaked,
  pairToStake,
  currencyReward,
  totalRewardAmount,
  minimumToStake,
  minimumTotalStaked,
  minimumStakers,
  poolLifespan,
  tax,
}: {
  currencyStaked?: Currency
  pairToStake?: Pair
  currencyReward?: Currency
  totalRewardAmount?: CurrencyAmount<Currency>
  minimumToStake?: CurrencyAmount<Currency>
  minimumTotalStaked?: CurrencyAmount<Currency>
  minimumStakers?: JSBI
  poolLifespan?: JSBI
  tax?: boolean
}) {
  const { chainId } = useActiveWeb3React()
  const theme = useTheme()

  const stakedCurrencySymbol = useMemo(() => {
    return pairToStake ? `${pairToStake.token0.symbol}:${pairToStake.token1.symbol}` : currencyStaked?.symbol
  }, [currencyStaked, pairToStake])

  if (!chainId || !currencyStaked || !currencyReward || !minimumToStake || !minimumTotalStaked || !totalRewardAmount) {
    return null
  }

  return (
    <Wrapper>
      <AutoColumn gap="md">
        <RowBetween>
          <RowFixed>
            {pairToStake ? (
              <DoubleCurrencyLogo
                currency0={pairToStake.token0 ?? undefined}
                currency1={pairToStake.token1 ?? undefined}
                size={24}
                margin={true}
              />
            ) : (
              <CurrencyLogo currency={currencyStaked} />
            )}
            <TYPE.label ml="10px" fontSize="24px">
              {stakedCurrencySymbol}
            </TYPE.label>
          </RowFixed>
        </RowBetween>

        <RowBetween style={{ marginBottom: '0.5rem' }}>
          <RowFixed>
            <CurrencyLogo currency={currencyReward} />

            <TYPE.label ml="10px" fontSize="24px">
              {currencyReward?.symbol}
            </TYPE.label>
          </RowFixed>
        </RowBetween>

        <LightCard>
          <AutoColumn gap="md">
            <TYPE.label>Total rewards</TYPE.label>

            <RowBetween>
              <RowFixed>
                <CurrencyLogo currency={currencyReward} />
                <TYPE.label ml="8px">{currencyReward.symbol}</TYPE.label>
              </RowFixed>
              <RowFixed>
                <TYPE.label mr="8px">{totalRewardAmount.toFixed(2, { groupSeparator: ',' })}</TYPE.label>
              </RowFixed>
            </RowBetween>

            <TYPE.label marginTop="0.5rem">Pool creation fee</TYPE.label>

            <RowBetween>
              <RowFixed>
                <CurrencyLogo currency={WETH9_EXTENDED[chainId]} />
                <TYPE.label ml="8px">BNB</TYPE.label>
              </RowFixed>
              <RowFixed>
                <TYPE.label mr="8px">{SP_MAKER_BNB_FEE.toFixed(2)}</TYPE.label>
              </RowFixed>
            </RowBetween>
          </AutoColumn>
        </LightCard>

        <LightCard>
          <AutoColumn gap="md">
            <RowBetween>
              <TYPE.black fontSize={12} fontWeight={400} color={theme.text2}>
                <Trans>Pool minimum lifespan</Trans>
              </TYPE.black>
              <TYPE.black textAlign="right" fontSize={12} color={theme.text1}>
                {poolLifespan?.toString() ?? 0} days
              </TYPE.black>
            </RowBetween>

            <RowBetween>
              <TYPE.black fontSize={12} fontWeight={400} color={theme.text2}>
                <Trans>Minimum to stake</Trans>
              </TYPE.black>
              <TYPE.black textAlign="right" fontSize={12} color={theme.text1}>
                {minimumToStake.toSignificant(6, { groupSeparator: ',' })} {stakedCurrencySymbol}
              </TYPE.black>
            </RowBetween>

            <RowBetween>
              <TYPE.black fontSize={12} fontWeight={400} color={theme.text2}>
                <Trans>Minimum total staked</Trans>
              </TYPE.black>
              <TYPE.black textAlign="right" fontSize={12} color={theme.text1}>
                {minimumTotalStaked.toSignificant(6, { groupSeparator: ',' })} {stakedCurrencySymbol}
              </TYPE.black>
            </RowBetween>

            <RowBetween>
              <TYPE.black fontSize={12} fontWeight={400} color={theme.text2}>
                <Trans>Minimum number of stakers</Trans>
              </TYPE.black>
              <TYPE.black textAlign="right" fontSize={12} color={theme.text1}>
                {minimumStakers?.toString() ?? 0}
              </TYPE.black>
            </RowBetween>

            <RowBetween>
              <TYPE.black fontSize={12} fontWeight={400} color={theme.text2}>
                <Trans>Staking / Unstaking tax</Trans>
              </TYPE.black>
              <TYPE.black textAlign="right" fontSize={12} color={theme.text1}>
                {tax ? `${SP_MAKER_STAKING_TAX.toFixed(0)}% / ${SP_MAKER_UNSTAKING_TAX.toFixed(0)}%` : '0%'}
              </TYPE.black>
            </RowBetween>
          </AutoColumn>
        </LightCard>
      </AutoColumn>
    </Wrapper>
  )
}
