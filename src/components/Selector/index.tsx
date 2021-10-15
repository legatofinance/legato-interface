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

export default function Selector({
  selected,
  handleSelection,
  titles,
  descriptions,
}: {
  selected: boolean
  handleSelection: (active: boolean) => void
  titles: [string, string]
  descriptions: [string, string]
}) {
  return (
    <RowBetween>
      <ButtonRadioChecked width="48%" active={!selected} onClick={() => handleSelection(false)}>
        <AutoColumn justify="flex-start" gap="6px">
          <ResponsiveText>
            <Trans>{titles[0]}</Trans>
          </ResponsiveText>
          <TYPE.main fontWeight={400} fontSize="12px" textAlign="left">
            <Trans>{descriptions[0]}</Trans>
          </TYPE.main>
        </AutoColumn>
      </ButtonRadioChecked>

      <ButtonRadioChecked width="48%" active={selected} onClick={() => handleSelection(true)}>
        <AutoColumn justify="flex-start" gap="6px">
          <ResponsiveText>
            <Trans>{titles[1]}</Trans>
          </ResponsiveText>
          <TYPE.main fontWeight={400} fontSize="12px" textAlign="left">
            <Trans>{descriptions[1]}</Trans>
          </TYPE.main>
        </AutoColumn>
      </ButtonRadioChecked>
    </RowBetween>
  )
}
