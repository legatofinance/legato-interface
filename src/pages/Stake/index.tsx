import { useState, useCallback } from 'react'
import JSBI from 'jsbi'
import { Link } from 'react-router-dom'
import { AutoColumn } from '../../components/Column'
import styled from 'styled-components/macro'
import { useStakingInfo } from '../../state/stake/hooks'
import { TYPE, ExternalLink } from '../../theme'
import { Text } from 'rebass'
import PoolCard from '../../components/earn/PoolCard'
import { RowBetween, RowFixed } from '../../components/Row'
import { ButtonPrimary, ButtonSecondary } from '../../components/Button'
import { CardSection, DataCard, CardNoise, CardBGImage, CardBGImageAtmosphere } from '../../components/earn/styled'
import Loader from '../../components/Loader'
import { useActiveWeb3React } from '../../hooks/web3'
import { BIG_INT_ZERO } from '../../constants/misc'
import { STAKING_ROUTER_ADDRESS } from '../../constants/addresses'
import Card, { OutlineCard } from '../../components/Card'
import { currencyId } from '../../utils/currencyId'
import { Trans } from '@lingui/macro'
import Select from '../../components/Select'
import SearchBar from '../../components/SearchBar'
import { useV2StakingPools } from '../../hooks/useV2StakingPools'
import useTheme from 'hooks/useTheme'
import { usePoolsData } from 'state/stake/v2/hooks'

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

const TitleRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-wrap: wrap;
    gap: 16px;
    width: 100%;

    & > * {
      width: 100% !important;
    }
  `};
`

const ButtonRow = styled(RowFixed)`
  gap: 8px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: fit-content !important;
    flex-direction: row-reverse;
    justify-content: space-between;
  `};
`

const ResponsiveButtonPrimary = styled(ButtonPrimary)`
  width: 150px;
  height: 40px;
  border-radius: 8px;
`

const CheckBoxWrapper = styled.div`
  position: relative;
  height: 26px;
`

const CheckBoxLabel = styled.label`
  position: absolute;
  top: 0;
  left: 0;
  width: 42px;
  height: 26px;
  border-radius: 15px;
  background: ${({ theme }) => theme.bg5};
  cursor: pointer;

  &::after {
    content: '';
    display: block;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    margin: 4px;
    background: #ffffff;
    box-shadow: 1px 3px 3px 1px rgba(0, 0, 0, 0.2);
    transition: 0.2s;
  }
`

const CheckBox = styled.input`
  opacity: 0;
  z-index: 1;
  border-radius: 15px;
  width: 42px;
  height: 26px;

  &:checked + ${CheckBoxLabel} {
    background: ${({ theme }) => theme.primary1};

    &::after {
      content: '';
      display: block;
      border-radius: 50%;
      width: 18px;
      height: 18px;
      margin-left: 21px;
      transition: 0.2s;
    }
  }
`

const StyledSelect = styled(Select)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 100%;
  `}
`

const StyledSearchBar = styled(SearchBar)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 100%;
  `}
`

export enum StakingBoardSortingOption {
  APY = 'APY',
  TVL = 'TVL',
}

export default function Earn() {
  const theme = useTheme()
  const { chainId, account } = useActiveWeb3React()

  const [hideEmptyDeposits, setHideEmptyDeposits] = useState(false)
  const [sortingOption, setSortingOption] = useState(StakingBoardSortingOption.APY)
  const poolsData = usePoolsData()

  const toggleHideEmptyDeposits = useCallback(() => {
    setHideEmptyDeposits(!hideEmptyDeposits)
  }, [hideEmptyDeposits, setHideEmptyDeposits])

  const updateSortingOption = useCallback(
    (newSortingOption) => {
      setSortingOption(newSortingOption.value)
    },
    [sortingOption, setSortingOption]
  )

  // staking info for connected account
  const v1StakingInfos = useStakingInfo() ?? []
  const v2StakingPools = useV2StakingPools() ?? []

  const stakingInfos = [...v1StakingInfos, ...v2StakingPools]
    .filter((stakingInfo) => stakingInfo.stakedAmount.greaterThan('0') || (stakingInfo.open && !hideEmptyDeposits))
    .sort((a, b) => {
      switch (sortingOption) {
        case StakingBoardSortingOption.APY:
          return poolsData[a.poolUid]?.apy < poolsData[b.poolUid]?.apy ? 1 : -1
          break

        case StakingBoardSortingOption.TVL:
          return poolsData[a.poolUid]?.totalDeposited < poolsData[b.poolUid]?.totalDeposited ? 1 : -1
          break
      }
    })

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
                  <Trans>Legato staking and liquidity mining</Trans>
                </TYPE.white>
              </RowBetween>
              <RowBetween>
                <TYPE.white fontSize={14}>
                  <Trans>Deposit your tokens to receive interest through the Legato protocol.</Trans>
                </TYPE.white>
              </RowBetween>{' '}
              <ExternalLink
                style={{ color: 'white', textDecoration: 'underline' }}
                href="https://legato.finance/en/blog/introducing-legatoswap/#stake"
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
        <TitleRow style={{ alignItems: 'center' }}>
          <TYPE.mediumHeader>
            <Trans>Staking board</Trans>
          </TYPE.mediumHeader>
          <ButtonRow>
            <Text opacity={0.6} fontWeight={500} fontSize={16}>
              Hide empty deposits
            </Text>
            <CheckBoxWrapper>
              <CheckBox id="checkbox" type="checkbox" checked={hideEmptyDeposits} onChange={toggleHideEmptyDeposits} />
              <CheckBoxLabel htmlFor="checkbox" />
            </CheckBoxWrapper>
          </ButtonRow>
        </TitleRow>

        <TitleRow style={{ alignItems: 'flex-end' }}>
          <AutoColumn gap="sm">
            <TYPE.white fontSize={14} style={{ marginLeft: '8px' }}>
              Sort by:
            </TYPE.white>
            <StyledSelect
              options={[
                {
                  label: 'APY',
                  value: StakingBoardSortingOption.APY,
                },
                {
                  label: 'Total deposited',
                  value: StakingBoardSortingOption.TVL,
                },
              ]}
              onOptionChange={updateSortingOption}
            />
          </AutoColumn>

          <AutoColumn gap="sm">
            <TYPE.white fontSize={14} style={{ marginLeft: '8px' }}>
              Search:
            </TYPE.white>
            <StyledSearchBar placeholder="Search pools" onTextChange={(text) => console.log(text)} />
          </AutoColumn>

          <ResponsiveButtonPrimary id="create-pool-button" as={Link} to="/stake/create" padding="6px 8px">
            <Text fontWeight={500} fontSize={16}>
              Create pool
            </Text>
          </ResponsiveButtonPrimary>
        </TitleRow>

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
