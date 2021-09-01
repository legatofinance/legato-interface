import { useContext } from 'react'
import JSBI from 'jsbi'
import { AutoColumn } from '../../components/Column'
import styled, { ThemeContext } from 'styled-components/macro'
import { useStakingInfo } from '../../state/stake/hooks'
import { TYPE, ExternalLink } from '../../theme'
import PoolCard from '../../components/earn/PoolCard'
import { RowBetween } from '../../components/Row'
import { CardSection, DataCard, CardNoise, CardBGImage, CardBGImageAtmosphere } from '../../components/earn/styled'
import Loader from '../../components/Loader'
import { useActiveWeb3React } from '../../hooks/web3'
import { BIG_INT_ZERO } from '../../constants/misc'
import { STAKING_ROUTER_ADDRESS } from '../../constants/addresses'
import Card, { OutlineCard } from '../../components/Card'
import { currencyId } from '../../utils/currencyId'
import { Trans } from '@lingui/macro'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const TopSection = styled(AutoColumn)`
  max-width: 720px;
  width: 100%;
`

const PoolSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 10px;
  row-gap: 15px;
  width: 100%;
  justify-self: center;
`

const DataRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
flex-direction: column;
`};
`

export default function Earn() {
  const theme = useContext(ThemeContext)
  const { chainId, account } = useActiveWeb3React()

  // staking info for connected account
  const stakingInfos = useStakingInfo()?.filter(
    (stakingInfo) => stakingInfo.open || stakingInfo.stakedAmount.greaterThan('0')
  )

  return (
    <PageWrapper gap="lg" justify="center">
      <TopSection gap="md">
        <DataCard>
          <CardBGImage atmosphere={CardBGImageAtmosphere.URBAN} />
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.white fontWeight={600}>
                  <Trans>LamboDoge staking and liquidity mining</Trans>
                </TYPE.white>
              </RowBetween>
              <RowBetween>
                <TYPE.white fontSize={14}>
                  <Trans>Deposit your Liquidity Provider tokens to receive LDOGE, the LamboDoge protocol token.</Trans>
                </TYPE.white>
              </RowBetween>{' '}
              <ExternalLink
                style={{ color: 'white', textDecoration: 'underline' }}
                href="https://lambodoge.org/#innovations"
                target="_blank"
              >
                <TYPE.white fontSize={14}>
                  <Trans>Read more about staking</Trans>
                </TYPE.white>
              </ExternalLink>
            </AutoColumn>
          </CardSection>
          <CardNoise />
        </DataCard>
      </TopSection>

      <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
        <DataRow style={{ alignItems: 'baseline' }}>
          <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>
            <Trans>Participating pools</Trans>
          </TYPE.mediumHeader>
        </DataRow>

        <PoolSection>
          {!account ? (
            <Card padding="40px">
              <TYPE.body color={theme.text3} textAlign="center">
                <Trans>Connect to a wallet to view the pools.</Trans>
              </TYPE.body>
            </Card>
          ) : !stakingInfos ? (
            <Loader style={{ margin: 'auto' }} />
          ) : stakingInfos?.length === 0 ? (
            <OutlineCard>
              <Trans>No active pools</Trans>
            </OutlineCard>
          ) : (
            stakingInfos?.map((stakingInfo, index) => {
              // need to sort by added liquidity here
              return <PoolCard key={`${currencyId(stakingInfo?.stakedToken)}-${index}`} stakingInfo={stakingInfo} />
            })
          )}
        </PoolSection>
      </AutoColumn>
    </PageWrapper>
  )
}
