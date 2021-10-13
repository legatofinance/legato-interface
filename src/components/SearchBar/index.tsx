import React, { InputHTMLAttributes } from 'react'
import styled from 'styled-components/macro'

const StyledSearchBar = styled.input`
  height: 40px;
  width: 200px;
  padding: 0 8px;
  border: 1px solid ${({ theme }) => theme.bg3};
  border-radius: 8px;
  background: ${({ theme }) => theme.bg0};
  outline: none;
  color: ${({ theme }) => theme.text1};
  font-size: 16px;
  font-weight: 500;
  transition: border 100ms;

  &:focus {
    border-color: ${({ theme }) => theme.primary1};
  }
`

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  onTextChange: (text: string) => void
}

export default function SearchBar({ onTextChange, ...props }: SearchBarProps) {
  return <StyledSearchBar {...props} />
}
