import React, { useState, useRef, useEffect, useCallback, HTMLAttributes } from 'react'
import styled from 'styled-components/macro'
import { ReactComponent as Caret } from '../../assets/images/caret.svg'

const DropDownHeader = styled.div`
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0px 16px 0 8px;
  transition: border-radius 0.15s;

  p {
    margin: 0;
  }
`

const DropDownListContainer = styled.div`
  background: ${({ theme }) => theme.bg0};
  height: 0;
  position: absolute;
  margin-top: 8px;
  overflow: hidden;
  transition: transform 0.15s, opacity 0.15s;
  transform: scaleY(0);
  transform-origin: top;
  opacity: 0;
  left: 0;
  right: 0;
  border: 1px solid ${({ theme }) => theme.white}80;
  box-shadow: 0 0 10px ${({ theme }) => theme.bg2};
  border-radius: 8px;
`

const DropDownContainer = styled.div<{ isOpen: boolean }>`
  cursor: pointer;
  position: relative;
  background: ${({ theme }) => theme.bg0};
  min-width: 180px;
  width: fit-content;
  border-radius: 8px;
  z-index: 99;

  ${({ isOpen }) =>
    isOpen &&
    `
      ${DropDownListContainer} {
        height: auto;
        transform: scaleY(1);
        opacity: 1;
      }

      svg {
        transform: rotate(90deg);
      }
    `}

  svg {
    fill: ${({ theme }) => theme.text1};
    height: 12px;
    transition: transform 200ms ease;
  }
`

const DropDownList = styled.ul`
  padding: 0;
  margin: 0;
  box-sizing: border-box;
`

const ListItem = styled.li`
  list-style: none;
  padding: 12px 16px;

  &:hover {
    background: ${({ theme }) => theme.bg2}80;
  }
`

interface SelectProps extends HTMLAttributes<HTMLDivElement> {
  options: OptionProps[]
  onOptionChange?: (option: OptionProps) => void
}

interface OptionProps {
  label: string
  value: any
}

export default function Select({ options, onOptionChange, ...props }: SelectProps) {
  const dropdownRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)

  const toggling = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      setIsOpen(!isOpen)
      event.stopPropagation()
    },
    [setIsOpen, isOpen]
  )

  const onOptionClicked = (selectedIndex: number) => () => {
    setSelectedOptionIndex(selectedIndex)
    setIsOpen(false)

    if (onOptionChange) {
      onOptionChange(options[selectedIndex])
    }
  }

  useEffect(() => {
    const handleClickOutside = () => {
      setIsOpen(false)
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  return (
    <DropDownContainer isOpen={isOpen} {...props}>
      <DropDownHeader onClick={toggling}>
        <p>{options[selectedOptionIndex].label}</p>
        <Caret />
      </DropDownHeader>
      <DropDownListContainer>
        <DropDownList ref={dropdownRef}>
          {options.map((option, index) =>
            index !== selectedOptionIndex ? (
              <ListItem onClick={onOptionClicked(index)} key={option.label}>
                {option.label}
              </ListItem>
            ) : null
          )}
        </DropDownList>
      </DropDownListContainer>
    </DropDownContainer>
  )
}
