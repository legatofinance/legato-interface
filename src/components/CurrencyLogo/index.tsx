import { Currency } from '@uniswap/sdk-core'
import React, { useMemo } from 'react'
import styled from 'styled-components/macro'
import BinanceLogo from '../../assets/images/binance-logo.png'
import LegatoLogo from '../../assets/images/legato-logo.png'
import useHttpLocations from '../../hooks/useHttpLocations'
import { WrappedTokenInfo } from '../../state/lists/wrappedTokenInfo'
import { SupportedChainId } from 'constants/chains'
import { LDOGE } from '../../constants/tokens'
import Logo from '../Logo'

export const getTokenLogoURL = (address: string) =>
  `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${address}/logo.png`

const StyledBinanceLogo = styled.img<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
  border-radius: 24px;
`

const StyledLogo = styled(Logo)<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: ${({ size }) => size};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
  background-color: ${({ theme }) => theme.white};
`

export default function CurrencyLogo({
  currency,
  size = '24px',
  style,
  ...rest
}: {
  currency?: Currency
  size?: string
  style?: React.CSSProperties
}) {
  const uriLocations = useHttpLocations(currency instanceof WrappedTokenInfo ? currency.logoURI : undefined)

  const srcs: string[] = useMemo(() => {
    if (!currency || currency.isNative) return []

    if (currency.isToken) {
      const defaultUrls = currency.chainId === SupportedChainId.MAINNET ? [getTokenLogoURL(currency.address)] : []
      if (currency instanceof WrappedTokenInfo) {
        return [...uriLocations, ...defaultUrls]
      }
      return defaultUrls
    }
    return []
  }, [currency, uriLocations])

  if (currency?.isNative) {
    return <StyledBinanceLogo src={BinanceLogo} size={size} style={style} {...rest} />
  } else if (currency?.equals(LDOGE[SupportedChainId.MAINNET]) || currency?.equals(LDOGE[SupportedChainId.TESTNET])) {
    return <StyledBinanceLogo src={LegatoLogo} size={size} style={style} {...rest} />
  }

  return <StyledLogo size={size} srcs={srcs} alt={`${currency?.symbol ?? 'token'} logo`} style={style} {...rest} />
}
