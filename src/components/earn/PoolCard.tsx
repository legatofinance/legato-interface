import { AutoColumn } from '../Column'
import { RowBetween } from '../Row'
import styled from 'styled-components/macro'
import { TYPE, StyledInternalLink } from '../../theme'
import DoubleCurrencyLogo from '../DoubleLogo'
import CurrencyLogo from '../../components/CurrencyLogo'
import { CurrencyAmount, Token, Currency } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { ButtonPrimary } from '../Button'
import { StakingInfo } from '../../state/stake/hooks'
import { useColor } from '../../hooks/useColor'
import { currencyId } from '../../utils/currencyId'
import { Break, CardNoise, CardBGImage, CardBGImageAtmosphere } from './styled'
import { unwrappedToken } from '../../utils/unwrappedToken'
import { useTotalSupply } from '../../hooks/useTotalSupply'
import { useV2Pair } from '../../hooks/useV2Pairs'
import useUSDCPrice, { usePriceRatio } from '../../hooks/useUSDCPrice'
import { BIG_INT_SECONDS_IN_WEEK } from '../../constants/misc'
import { Trans } from '@lingui/macro'
import { transparentize } from 'polished'
import { useActiveWeb3React } from '../../hooks/web3'

const StatContainer = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 1rem;
  margin-right: 1rem;
  margin-left: 1rem;
  ${({ theme }) => theme.mediaWidth.upToSmall`
  display: none;
`};
`

const Wrapper = styled(AutoColumn)<{ showBackground: boolean; bgColor: any }>`
  border-radius: 12px;
  width: 100%;
  overflow: hidden;
  position: relative;
  opacity: 1;
  background: ${({ theme, bgColor, showBackground }) =>
    showBackground
      ? `radial-gradient(91.85% 100% at 1.84% 0%, ${transparentize(0.5, bgColor)} 0%, ${theme.bg0} 100%)`
      : `${theme.bg0}`};
  color: ${({ theme, showBackground }) => (showBackground ? theme.white : theme.text1)} !important;

  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}

  ${({ showBackground }) =>
    !showBackground &&
    `
      ${CardBGImage} {
        display: none;
      }`}
`

const TopSection = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr 120px;
  grid-gap: 0px;
  align-items: center;
  padding: 1rem;
  z-index: 1;
  margin-left: 12px;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 36px 1fr 96px;
  `};
`

const BottomSection = styled.div<{ showBackground: boolean }>`
  padding: 12px 16px;
  opacity: ${({ showBackground }) => (showBackground ? '1' : '0.4')};
  border-radius: 0 0 12px 12px;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  z-index: 1;
`

export default function PoolCard({ stakingInfo }: { stakingInfo: StakingInfo }) {
  const token0 = stakingInfo.stakedPairTokens?.[0]
  const token1 = stakingInfo.stakedPairTokens?.[1]

  const currency0 = token0 ? unwrappedToken(token0) : undefined
  const currency1 = token1 ? unwrappedToken(token1) : undefined

  const isStaking = Boolean(stakingInfo.stakedAmount.greaterThan('0'))

  // get the color of the token
  const token = currency0?.isNative ? token1 : currency0 ? token0 : stakingInfo.stakedToken
  const WETH = currency0?.isNative ? token0 : currency0 ? token1 : stakingInfo.stakedToken
  const backgroundColor = useColor(token)

  const totalSupplyOfStakingToken = useTotalSupply(stakingInfo.stakedAmount.currency)
  const [, stakingTokenPair] = useV2Pair(...(stakingInfo.stakedPairTokens ?? []))

  // let returnOverMonth: Percent = new Percent('0')
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
        totalSupplyOfStakingToken.quotient
      )
    )
  }

  const apy = usePriceRatio(stakingTokenPair || stakingInfo?.stakedToken, stakingInfo?.rewardToken)
    ?.divide(stakingInfo?.apy)
    .invert()

  // get the USD value of staked WETH
  const USDPrice = useUSDCPrice(WETH)

  let valueOfTotalStakedAmountInUSDC: CurrencyAmount<Currency> | undefined
  if ((WETH === stakingInfo?.stakedToken || valueOfTotalStakedAmountInWETH) && stakingInfo) {
    valueOfTotalStakedAmountInUSDC = USDPrice?.quote(valueOfTotalStakedAmountInWETH ?? stakingInfo?.totalStakedAmount)
  }

  return (
    <Wrapper showBackground={isStaking} bgColor={backgroundColor}>
      <CardBGImage
        desaturate
        atmosphere={stakingInfo?.stakedPairTokens ? CardBGImageAtmosphere.FLYING : CardBGImageAtmosphere.FOREST}
      />
      <CardNoise />

      <TopSection>
        {currency0 && currency1 ? (
          <DoubleCurrencyLogo currency0={currency0} currency1={currency1} size={24} />
        ) : (
          <CurrencyLogo currency={stakingInfo.stakedToken} size={'24px'} />
        )}
        <TYPE.white fontWeight={600} fontSize={24}>
          {currency0 && currency1 ? `${currency0.symbol}-${currency1.symbol}` : stakingInfo.stakedToken.symbol}
        </TYPE.white>

        <StyledInternalLink
          to={`/stake/${currencyId(stakingInfo.stakedToken)}/${currencyId(stakingInfo.rewardToken)}`}
          style={{ width: '100%' }}
        >
          <ButtonPrimary padding="8px" $borderRadius="8px">
            {isStaking ? <Trans>Manage</Trans> : <Trans>Deposit</Trans>}
          </ButtonPrimary>
        </StyledInternalLink>
      </TopSection>

      <StatContainer>
        <RowBetween>
          <TYPE.white>
            <Trans>Total deposited</Trans>
          </TYPE.white>
          <TYPE.white>
            {valueOfTotalStakedAmountInUSDC
              ? `$${valueOfTotalStakedAmountInUSDC.toFixed(2, { groupSeparator: ',' })}`
              : `${valueOfTotalStakedAmountInWETH?.toSignificant(4, { groupSeparator: ',' }) ?? '-'} BNB`}
          </TYPE.white>
        </RowBetween>
        <RowBetween>
          <TYPE.white>
            <Trans>Pool APY</Trans>
          </TYPE.white>
          <TYPE.white>{apy ? <Trans>{apy.toFixed(2)}%</Trans> : '-'}</TYPE.white>
        </RowBetween>
      </StatContainer>

      {isStaking && (
        <>
          <Break />
          <BottomSection showBackground={true}>
            <TYPE.black color={'white'} fontWeight={500}>
              <span>
                <Trans>Your rate</Trans>
              </span>
            </TYPE.black>

            <TYPE.black style={{ textAlign: 'right' }} color={'white'} fontWeight={500}>
              <span role="img" aria-label="wizard-icon" style={{ marginRight: '0.5rem' }}>
                ⚡
              </span>
              {stakingInfo ? (
                <Trans>
                  {stakingInfo?.userRewardRate?.multiply(BIG_INT_SECONDS_IN_WEEK)?.toFixed(0, { groupSeparator: ',' })}{' '}
                  {stakingInfo?.rewardToken.symbol} / week
                </Trans>
              ) : (
                '-'
              )}
            </TYPE.black>
          </BottomSection>
        </>
      )}
    </Wrapper>
  )
}
