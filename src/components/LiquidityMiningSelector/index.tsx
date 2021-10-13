import React, { useCallback } from 'react'
import { Trans } from '@lingui/macro'
import { ButtonRadioChecked } from 'components/Button'
import { AutoColumn } from 'components/Column'
import { RowBetween } from 'components/Row'
import styled from 'styled-components/macro'
import { TYPE } from 'theme'

const ResponsiveText = styled(TYPE.label)`
  line-height: 16px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    font-size: 12px;
    line-height: 12px;
  `};
`

export default function LiquidityMiningSelector({
  liquidityMining,
  handleLiquidityMiningSelect,
}: {
  liquidityMining: boolean
  handleLiquidityMiningSelect: (liquidityMining: boolean) => void
}) {
  return (
    <RowBetween>
      <ButtonRadioChecked width="48%" active={!liquidityMining} onClick={() => handleLiquidityMiningSelect(false)}>
        <AutoColumn justify="flex-start" gap="6px">
          <ResponsiveText>
            <Trans>Classic Staking</Trans>
          </ResponsiveText>
          <TYPE.main fontWeight={400} fontSize="12px" textAlign="left">
            <Trans>Incentivize holding</Trans>
          </TYPE.main>
        </AutoColumn>
      </ButtonRadioChecked>

      <ButtonRadioChecked width="48%" active={liquidityMining} onClick={() => handleLiquidityMiningSelect(true)}>
        <AutoColumn justify="flex-start" gap="6px">
          <ResponsiveText>
            <Trans>Liquidity mining</Trans>
          </ResponsiveText>
          <TYPE.main fontWeight={400} fontSize="12px" textAlign="left">
            <Trans>Incentivize liquidity providing</Trans>
          </TYPE.main>
        </AutoColumn>
      </ButtonRadioChecked>
    </RowBetween>
  )
}
