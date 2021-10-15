import React from 'react'
import styled from 'styled-components/macro'
import { Minus, Plus } from 'react-feather'
import { darken } from 'polished'

import { RowBetween } from 'components/Row'
import { ButtonGray } from 'components/Button'
import { TYPE } from 'theme'
import NumericalInput from 'components/NumericalInput'

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

  :focus,
  :hover {
    border: 1px solid ${({ theme }) => theme.bg3};
  }
`

const InputRow = styled.div`
  display: grid;
  grid-template-columns: 30px 1fr 30px;
  width: 100%;
`

const SmallButton = styled(ButtonGray)<{ disabled: boolean }>`
  background-color: ${({ disabled, theme }) => (disabled ? theme.bg0 : theme.primary1)};
  border-radius: 8px;
  padding: 4px;

  &:hover {
    background-color: ${({ disabled, theme }) => (disabled ? theme.bg0 : darken(0.05, theme.primary1))};
  }
`

interface InputStepCounterProps {
  value: string
  onUserInput: (value: string) => void
  onDecrement: () => void
  onIncrement: () => void
  incrementDisabled?: boolean
  decrementDisabled?: boolean
  placeholder?: string
  children?: React.ReactNode
}

const InputStepCounter = ({
  value,
  onUserInput,
  onDecrement,
  onIncrement,
  incrementDisabled,
  decrementDisabled,
  placeholder,
  children,
}: InputStepCounterProps) => {
  return (
    <StyledInput>
      {children}

      <InputRow>
        <SmallButton onClick={onDecrement} disabled={decrementDisabled ?? false}>
          <TYPE.white fontSize="12px">
            <Minus size={18} />
          </TYPE.white>
        </SmallButton>

        <NumericalInput align="center" value={value} onUserInput={onUserInput} placeholder={placeholder} />

        <SmallButton onClick={onIncrement} disabled={incrementDisabled ?? false}>
          <TYPE.white fontSize="12px">
            <Plus size={18} />
          </TYPE.white>
        </SmallButton>
      </InputRow>
    </StyledInput>
  )
}

export default InputStepCounter
