import React from 'react'
import styled from 'styled-components/macro'

import { BodyWrapper } from 'pages/AppBody'
import { RowBetween } from 'components/Row'
import { AutoColumn } from 'components/Column'
import CurrencyInputPanel from 'components/CurrencyInputPanel'

export const ScrollablePage = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    max-width: 480px;
    margin: 0 auto;
  `};
`

export const PageWrapper = styled(BodyWrapper)<{ wide: boolean }>`
  max-width: ${({ wide }) => (wide ? '880px' : '480px')};
  width: 100%;
  padding: ${({ wide }) => (wide ? '10px' : '0')};

  ${({ theme }) => theme.mediaWidth.upToMedium`
    max-width: 480px;
  `};
`

export const Wrapper = styled.div`
  position: relative;
  padding: 26px 16px;
  min-width: 480px;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    min-width: 400px;
  `};

  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    min-width: 340px;
  `};
`

export const ResponsiveTwoColumns = styled.div<{ wide: boolean }>`
  display: grid;
  grid-column-gap: 50px;
  grid-row-gap: 15px;
  grid-template-columns: ${({ wide }) => (wide ? '1fr 1fr' : '1fr')};
  grid-template-rows: max-content;
  grid-auto-flow: row;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.bg2};

  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;
    margin-top: 0;
  `};
`

const StyledPageHeader = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  justify-content: space-evenly;
`

export const PageHeader = ({ children }: { children: React.ReactNode }) => {
  return (
    <StyledPageHeader>
      <RowBetween style={{ padding: '1rem 1rem 0 1rem' }}>{children}</RowBetween>
    </StyledPageHeader>
  )
}

export const CurrencyDropdown = styled(CurrencyInputPanel)`
  width: 48.5%;
`

export const RightContainer = styled(AutoColumn)`
  grid-row: 1 / 3;
  grid-column: 2;
  height: fit-content;

  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-row: 2 / 3;
    grid-column: 1;
  `};
`

export const DynamicSection = styled(AutoColumn)<{ disabled?: boolean }>`
  opacity: ${({ disabled }) => (disabled ? '0.2' : '1')};
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'initial')};
`
