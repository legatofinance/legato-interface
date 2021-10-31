import { useCallback, useState } from 'react'
import { AutoColumn } from '../../components/Column'
import styled from 'styled-components/macro'
import { Link } from 'react-router-dom'
import JSBI from 'jsbi'
import { Token, CurrencyAmount, Currency, Fraction } from '@uniswap/sdk-core'
import { RouteComponentProps } from 'react-router-dom'
import DoubleCurrencyLogo from '../../components/DoubleLogo'
import CurrencyLogo from '../../components/CurrencyLogo'
import { useCurrency } from '../../hooks/Tokens'
import { useWalletModalToggle } from '../../state/application/hooks'
import { unwrappedToken } from '../../utils/unwrappedToken'
import { TYPE } from '../../theme'
import { Redirect } from 'react-router-dom'

import { RowBetween } from '../../components/Row'
import { CardSection, DataCard, CardNoise, CardBGImage, CardBGImageAtmosphere } from '../../components/earn/styled'
import { ButtonPrimary, ButtonEmpty } from '../../components/Button'
import StakingModal from '../../components/earn/StakingModal'
import { useStakingInfo, StakingInfo } from '../../state/stake/hooks'
import UnstakingModal from '../../components/earn/UnstakingModal'
import ClaimRewardModal from '../../components/earn/ClaimRewardModal'
import { useTokenBalance } from '../../state/wallet/hooks'
import { useActiveWeb3React } from '../../hooks/web3'
import { useColor } from '../../hooks/useColor'
import { CountUp } from 'use-count-up'

import { currencyId } from '../../utils/currencyId'
import { useTotalSupply } from '../../hooks/useTotalSupply'
import { useV2Pair } from '../../hooks/useV2Pairs'
import usePrevious from '../../hooks/usePrevious'
import useUSDCPrice, { usePriceRatio } from '../../hooks/useUSDCPrice'
import { BIG_INT_ZERO, BIG_INT_SECONDS_IN_WEEK } from '../../constants/misc'
import { Trans } from '@lingui/macro'
import { transparentize } from 'polished'
import getPoolUid from 'utils/getPoolUid'
import { useV2StakingPools } from 'hooks/useV2StakingPools'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const PositionInfo = styled(AutoColumn)<{ dim: any }>`
  position: relative;
  max-width: 640px;
  width: 100%;
  opacity: ${({ dim }) => (dim ? 0.3 : 1)};
`

const BottomSection = styled(AutoColumn)`
  border-radius: 12px;
  width: 100%;
  position: relative;
`

const StyledDataCard = styled(DataCard)<{ bgColor?: any; showBackground?: any }>`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #1e1a31 0%, #3d51a5 100%);
  z-index: 2;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  background: ${({ theme, bgColor, showBackground }) =>
    `radial-gradient(91.85% 100% at 1.84% 0%, ${transparentize(0.5, bgColor)} 0%,
    ${showBackground ? theme.bg0 : theme.bg5} 100%) `};
`

const StyledBottomCard = styled(DataCard)<{ dim: any }>`
  background: ${({ theme }) => theme.bg0};
  opacity: ${({ dim }) => (dim ? 0.4 : 1)};
  margin-top: -40px;
  padding: 0 1.25rem 1rem 1.25rem;
  padding-top: 32px;
  z-index: 1;
`

const PoolData = styled(DataCard)`
  background: none;
  border: 1px solid ${({ theme }) => theme.bg4};
  padding: 1rem;
  z-index: 1;
`

const VoteCard = styled(DataCard)`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #e0013b 0%, #160ce8 200%);
  overflow: hidden;
`

const DataRow = styled(RowBetween)`
  justify-content: center;
  gap: 12px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    gap: 12px;
  `};
`

export default function Manage({
  match: {
    params: { version, poolIndex },
  },
}: RouteComponentProps<{ version: string; poolIndex: string }>) {
  const poolUid = getPoolUid(version, poolIndex)

  const v1StakingInfos = useStakingInfo() ?? []
  const v2StakingPools = useV2StakingPools() ?? []

  const stakingInfo = [...v1StakingInfos, ...v2StakingPools].filter((stakingInfo) => stakingInfo?.poolUid == poolUid)[0]

  if (stakingInfo) {
    return <ManageContent stakingInfo={stakingInfo} />
  } else {
    return <Redirect to={{ pathname: '/stake' }} />
  }
}

function ManageContent({ stakingInfo }: { stakingInfo: StakingInfo }) {
  const { account } = useActiveWeb3React()

  // detect existing unstaked LP position to show add button if none found
  const userLiquidityUnstaked = useTokenBalance(account ?? undefined, stakingInfo.stakedAmount?.currency)
  const showAddLiquidityButton = Boolean(stakingInfo.stakedAmount?.equalTo('0') && userLiquidityUnstaked?.equalTo('0'))

  const token0 = stakingInfo.stakedPairTokens?.[0]
  const token1 = stakingInfo.stakedPairTokens?.[1]

  const currency0 = token0 ? unwrappedToken(token0) : undefined
  const currency1 = token1 ? unwrappedToken(token1) : undefined

  // get the color of the token
  const token = currency0?.isNative ? token1 : currency0 ? token0 : stakingInfo.stakedToken
  const WETH = currency0?.isNative ? token0 : currency0 ? token1 : stakingInfo.stakedToken

  // toggle for staking modal and unstaking modal
  const [showStakingModal, setShowStakingModal] = useState(false)
  const [showUnstakingModal, setShowUnstakingModal] = useState(false)
  const [showClaimRewardModal, setShowClaimRewardModal] = useState(false)

  const [isRetrieving, setIsRetrieving] = useState(false)

  const handleClaimRewardModal = useCallback(
    (retrieve: boolean) => {
      setIsRetrieving(retrieve)
      setShowClaimRewardModal(true)
    },
    [isRetrieving, setIsRetrieving, setShowClaimRewardModal]
  )

  // fade cards if nothing staked or nothing earned yet
  const disableTop = !stakingInfo.stakedAmount || stakingInfo.stakedAmount.equalTo(JSBI.BigInt(0))
  const claimable = stakingInfo.unclaimedAmount && JSBI.notEqual(BIG_INT_ZERO, stakingInfo.unclaimedAmount?.quotient)
  const retrievable =
    claimable || (stakingInfo.unclaimedAmount && JSBI.notEqual(BIG_INT_ZERO, stakingInfo.unclaimedAmount?.quotient))

  const totalSupplyOfStakingToken = useTotalSupply(stakingInfo.stakedAmount.currency)
  const [, stakingTokenPair] = useV2Pair(...(stakingInfo.stakedPairTokens ?? []))

  let valueOfTotalStakedAmountInWETH: CurrencyAmount<Currency> | undefined
  if (totalSupplyOfStakingToken && stakingTokenPair && WETH && stakingInfo) {
    // take the total amount of LP tokens staked, multiply by ETH value of all LP tokens, divide by all LP tokens
    valueOfTotalStakedAmountInWETH = CurrencyAmount.fromRawAmount(
      WETH,
      JSBI.divide(
        JSBI.multiply(
          JSBI.multiply(stakingInfo.totalStakedAmount.quotient, stakingTokenPair.reserveOf(WETH).quotient),
          JSBI.BigInt(2) // this is b/c the value of LP shares are ~double the value of the WETH they entitle owner to
        ),
        JSBI.equal(totalSupplyOfStakingToken.quotient, JSBI.BigInt(0))
          ? JSBI.BigInt(1)
          : totalSupplyOfStakingToken.quotient
      )
    )
  }

  const apy = usePriceRatio(stakingTokenPair || stakingInfo?.stakedToken, stakingInfo?.rewardToken)
    ?.divide(stakingInfo?.apy)
    .invert()

  // get the USD value of staked WETH
  const USDPrice = useUSDCPrice(WETH)

  let valueOfTotalStakedAmountInUSDC: CurrencyAmount<Currency> | undefined
  if ((WETH === stakingInfo.stakedToken || valueOfTotalStakedAmountInWETH) && stakingInfo) {
    valueOfTotalStakedAmountInUSDC = USDPrice?.quote(valueOfTotalStakedAmountInWETH ?? stakingInfo.totalStakedAmount)
  }

  const countUpUnclaimedAmount = stakingInfo.unclaimedAmount?.toFixed(6) ?? '0'
  const countUpUnclaimedAmountPrevious = usePrevious(countUpUnclaimedAmount) ?? '0'

  const countUpClaimedAmount = stakingInfo.claimedAmount?.toFixed(6) ?? '0'
  const countUpClaimedAmountPrevious = usePrevious(countUpClaimedAmount) ?? '0'

  const toggleWalletModal = useWalletModalToggle()

  const handleDepositClick = useCallback(() => {
    if (account) {
      setShowStakingModal(true)
    } else {
      toggleWalletModal()
    }
  }, [account, toggleWalletModal])

  const backgroundColor = useColor(token)

  return (
    <PageWrapper gap="lg" justify="center">
      <RowBetween style={{ gap: '24px' }}>
        <TYPE.mediumHeader style={{ margin: 0 }}>
          <Trans>
            {currency0 && currency1
              ? `${currency0?.symbol}-${currency1?.symbol} Liquidity Mining`
              : `${stakingInfo.stakedToken.symbol} Staking`}
          </Trans>
        </TYPE.mediumHeader>
        {currency0 && currency1 ? (
          <DoubleCurrencyLogo currency0={currency0} currency1={currency1} size={24} />
        ) : (
          <CurrencyLogo currency={stakingInfo.stakedToken} size={'24px'} />
        )}
      </RowBetween>

      <DataRow style={{ gap: '24px' }}>
        <PoolData>
          <AutoColumn gap="sm">
            <TYPE.body style={{ margin: 0 }}>
              <Trans>Total deposits</Trans>
            </TYPE.body>
            <TYPE.body fontSize={24} fontWeight={500}>
              ${valueOfTotalStakedAmountInUSDC?.toFixed(2, { groupSeparator: ',' }) ?? '0.00'}
            </TYPE.body>
          </AutoColumn>
        </PoolData>
        <PoolData>
          <AutoColumn gap="sm">
            <TYPE.body style={{ margin: 0 }}>
              <Trans>Pool APY</Trans>
            </TYPE.body>
            <TYPE.body fontSize={24} fontWeight={500}>
              {apy && +apy?.denominator.toString() ? <Trans>{apy.toFixed(2)}%</Trans> : '-'}
            </TYPE.body>
          </AutoColumn>
        </PoolData>
      </DataRow>

      {showAddLiquidityButton && (
        <VoteCard>
          <CardBGImage atmosphere={CardBGImageAtmosphere.URBAN} />
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.white fontWeight={600}>
                  <Trans>
                    {stakingInfo.stakedPairTokens
                      ? `Step 1. Get LDOGE-V2 Liquidity tokens`
                      : `Step 1. Get ${stakingInfo.stakedToken.symbol} tokens`}
                  </Trans>
                </TYPE.white>
              </RowBetween>
              <RowBetween style={{ marginBottom: '1rem' }}>
                <TYPE.white fontSize={14}>
                  <Trans>
                    {stakingInfo.stakedPairTokens
                      ? `LDOGE-V2 LP tokens are required. Once you've added liquidity to the ${currency0?.symbol}-
                      ${currency1?.symbol} pool you can stake your liquidity tokens on this page.`
                      : `${stakingInfo.stakedToken.symbol} tokens are required. Once you've bought some
                      you can stake your liquidity tokens on this page.`}
                  </Trans>
                </TYPE.white>
              </RowBetween>
              <ButtonPrimary
                padding="8px"
                $borderRadius="8px"
                width={'fit-content'}
                as={Link}
                to={
                  stakingInfo.stakedPairTokens
                    ? `/add/${currency0 && currencyId(currency0)}/${currency1 && currencyId(currency1)}`
                    : `/swap/${stakingInfo.stakedToken.symbol}/BNB`
                }
              >
                <Trans>
                  {stakingInfo.stakedPairTokens
                    ? `Add ${currency0?.symbol}-${currency1?.symbol} liquidity`
                    : `Swap ${stakingInfo.stakedToken.symbol} tokens`}
                </Trans>
              </ButtonPrimary>
            </AutoColumn>
          </CardSection>
          <CardNoise />
        </VoteCard>
      )}

      {stakingInfo && (
        <>
          <StakingModal
            isOpen={showStakingModal}
            onDismiss={() => setShowStakingModal(false)}
            stakingInfo={stakingInfo}
            userLiquidityUnstaked={userLiquidityUnstaked}
          />
          <UnstakingModal
            isOpen={showUnstakingModal}
            onDismiss={() => setShowUnstakingModal(false)}
            stakingInfo={stakingInfo}
          />
          <ClaimRewardModal
            isOpen={showClaimRewardModal}
            onDismiss={() => setShowClaimRewardModal(false)}
            stakingInfo={stakingInfo}
            retrieve={isRetrieving}
          />
        </>
      )}

      <PositionInfo gap="lg" justify="center" dim={showAddLiquidityButton}>
        <BottomSection gap="lg" justify="center">
          <StyledDataCard disabled={disableTop} bgColor={backgroundColor} showBackground={!showAddLiquidityButton}>
            <CardSection>
              <CardBGImage
                desaturate
                atmosphere={stakingInfo.stakedPairTokens ? CardBGImageAtmosphere.FLYING : CardBGImageAtmosphere.FOREST}
              />
              <CardNoise />
              <AutoColumn gap="md">
                <RowBetween>
                  <TYPE.white fontWeight={600}>
                    <Trans>{`Your ${stakingInfo.stakedPairTokens ? 'liquidity' : 'tokens'} deposits`}</Trans>
                  </TYPE.white>
                </RowBetween>
                <RowBetween style={{ alignItems: 'baseline' }}>
                  <TYPE.white fontSize={36} fontWeight={600}>
                    {stakingInfo.stakedAmount?.toSignificant(18) ?? '-'}
                  </TYPE.white>
                  <TYPE.white>
                    <Trans>
                      {stakingInfo.stakedPairTokens
                        ? `${currency0?.symbol}-${currency1?.symbol}`
                        : `${stakingInfo.stakedToken.symbol}`}
                    </Trans>
                  </TYPE.white>
                </RowBetween>
              </AutoColumn>
            </CardSection>
          </StyledDataCard>
          <StyledBottomCard dim={stakingInfo.stakedAmount?.equalTo(JSBI.BigInt(0))}>
            <CardNoise />
            <AutoColumn gap="sm">
              <RowBetween>
                <div>
                  <TYPE.black>
                    <Trans>Your unclaimed {stakingInfo.rewardToken.symbol}</Trans>
                  </TYPE.black>
                </div>
                {claimable && (
                  <ButtonEmpty
                    padding="8px"
                    $borderRadius="8px"
                    width="fit-content"
                    onClick={() => handleClaimRewardModal(false)}
                  >
                    <Trans>Claim</Trans>
                  </ButtonEmpty>
                )}
              </RowBetween>
              <RowBetween style={{ alignItems: 'baseline' }}>
                <TYPE.largeHeader fontSize={36} fontWeight={600}>
                  <CountUp
                    key={countUpUnclaimedAmount}
                    isCounting
                    decimalPlaces={6}
                    start={parseFloat(countUpUnclaimedAmountPrevious)}
                    end={parseFloat(countUpUnclaimedAmount)}
                    thousandsSeparator={','}
                    duration={1}
                  />
                </TYPE.largeHeader>
                <TYPE.black fontSize={16} fontWeight={500}>
                  <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px ' }}>
                    ⚡
                  </span>

                  <Trans>
                    {stakingInfo.userRewardRate?.multiply(BIG_INT_SECONDS_IN_WEEK)?.toFixed(0, { groupSeparator: ',' })}{' '}
                    {stakingInfo.rewardToken.symbol} / week
                  </Trans>
                </TYPE.black>
              </RowBetween>
            </AutoColumn>
            <AutoColumn gap="sm" style={{ marginTop: '1rem' }}>
              <RowBetween>
                <div>
                  <TYPE.black>
                    <Trans>Your claimed {stakingInfo.rewardToken.symbol}</Trans>
                  </TYPE.black>
                </div>
                {retrievable && (
                  <ButtonEmpty
                    padding="8px"
                    $borderRadius="8px"
                    width="fit-content"
                    onClick={() => handleClaimRewardModal(true)}
                  >
                    <Trans>Retrieve</Trans>
                  </ButtonEmpty>
                )}
              </RowBetween>
              <RowBetween style={{ alignItems: 'baseline' }}>
                <TYPE.largeHeader fontSize={36} fontWeight={600}>
                  <CountUp
                    key={countUpClaimedAmount}
                    isCounting
                    decimalPlaces={6}
                    start={parseFloat(countUpClaimedAmountPrevious)}
                    end={parseFloat(countUpClaimedAmount)}
                    thousandsSeparator={','}
                    duration={1}
                  />
                </TYPE.largeHeader>
              </RowBetween>
            </AutoColumn>
          </StyledBottomCard>
        </BottomSection>
        <TYPE.main style={{ textAlign: 'center' }} fontSize={14}>
          <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px' }}>
            ⭐️
          </span>
          <Trans>
            When you withdraw, the contract will automatically retrieve&nbsp;
            {stakingInfo.rewardToken.symbol} on your behalf!
            <br />
          </Trans>
          {stakingInfo.stakedToken.equals(stakingInfo.rewardToken) && (
            <>
              <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px' }}>
                ⭐️
              </span>
              <Trans>Claimed {stakingInfo.rewardToken.symbol} are automatically deposited to the pool</Trans>
            </>
          )}
        </TYPE.main>

        {!showAddLiquidityButton && (
          <DataRow style={{ margin: '0.5rem 0' }}>
            {stakingInfo && (
              <ButtonPrimary
                padding="8px"
                $borderRadius="8px"
                width={stakingInfo.stakedAmount?.greaterThan(JSBI.BigInt(0)) ? '160px' : '200px'}
                onClick={handleDepositClick}
              >
                {stakingInfo.stakedAmount?.greaterThan(JSBI.BigInt(0)) ? (
                  <Trans>Deposit</Trans>
                ) : (
                  <Trans>
                    Deposit
                    {stakingInfo.stakedPairTokens
                      ? ` ${currency0?.symbol}-${currency1?.symbol}`
                      : ` ${stakingInfo.stakedToken.symbol}`}
                  </Trans>
                )}
              </ButtonPrimary>
            )}

            {stakingInfo.stakedAmount?.greaterThan(JSBI.BigInt(0)) && (
              <>
                <ButtonPrimary
                  padding="8px"
                  $borderRadius="8px"
                  width="160px"
                  onClick={() => setShowUnstakingModal(true)}
                >
                  <Trans>Withdraw</Trans>
                </ButtonPrimary>
              </>
            )}
          </DataRow>
        )}
        {!userLiquidityUnstaked ? null : userLiquidityUnstaked.equalTo('0') ? null : (
          <TYPE.main>
            <Trans>
              {userLiquidityUnstaked.toSignificant(6)}
              {stakingInfo.stakedPairTokens
                ? ` LDOGE-V2 LP tokens available`
                : ` ${stakingInfo.stakedToken.symbol} tokens available`}
            </Trans>
          </TYPE.main>
        )}
      </PositionInfo>
    </PageWrapper>
  )
}
