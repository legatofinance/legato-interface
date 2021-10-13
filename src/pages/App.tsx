import ApeModeQueryParamReader from 'hooks/useApeModeQueryParamReader'
import { Route, Switch } from 'react-router-dom'
import styled from 'styled-components/macro'
import GoogleAnalyticsReporter from '../components/analytics/GoogleAnalyticsReporter'
import ErrorBoundary from '../components/ErrorBoundary'
import Header from '../components/Header'
import Polling from '../components/Header/Polling'
import Popups from '../components/Popups'
import Web3ReactManager from '../components/Web3ReactManager'
import { ApplicationModal } from '../state/application/actions'
import { useModalOpen, useToggleModal } from '../state/application/hooks'
import DarkModeQueryParamReader from '../theme/DarkModeQueryParamReader'
import { RedirectDuplicateTokenIdsV2 } from './AddLiquidityV2/redirects'
import Earn from './Stake'
import Manage from './Stake/Manage'
import PoolV2 from './Pool/v2'
import PoolFinder from './PoolFinder'
import RemoveLiquidity from './RemoveLiquidity'
import Swap from './Swap'
import { RedirectPathToSwapOnly, RedirectToSwap } from './Swap/redirects'
import Stake from './Stake'
import CreateStakingPool from './CreateStakingPool'

const AppWrapper = styled.div`
  display: flex;
  flex-flow: column;
  align-items: flex-start;
`

const BodyWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 120px 16px 0px 16px;
  align-items: center;
  flex: 1;
  z-index: 1;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    padding: 6rem 16px 16px 16px;
  `};
`

const HeaderWrapper = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  width: 100%;
  justify-content: space-between;
  position: fixed;
  top: 0;
  z-index: 2;
`

const Marginer = styled.div`
  margin-top: 5rem;
`

export default function App() {
  return (
    <ErrorBoundary>
      <Route component={GoogleAnalyticsReporter} />
      <Route component={DarkModeQueryParamReader} />
      <Route component={ApeModeQueryParamReader} />
      <Web3ReactManager>
        <AppWrapper>
          <HeaderWrapper>
            <Header />
          </HeaderWrapper>
          <BodyWrapper>
            <Popups />
            <Polling />
            <Switch>
              <Route exact strict path="/stake" component={Stake} />
              <Route exact strict path="/stake" component={Earn} />
              <Route exact strict path="/stake/:currencyIdA/:currencyIdB" component={Manage} />

              <Route exact strict path="/stake/create" component={CreateStakingPool} />

              <Route exact strict path="/send" component={RedirectPathToSwapOnly} />
              <Route exact strict path="/swap/:outputCurrency" component={RedirectToSwap} />
              <Route exact strict path="/swap" component={Swap} />

              <Route exact strict path="/pool/find" component={PoolFinder} />
              <Route exact strict path="/pool" component={PoolV2} />

              <Route exact strict path="/add/:currencyIdA?/:currencyIdB?" component={RedirectDuplicateTokenIdsV2} />

              <Route exact strict path="/remove/:currencyIdA/:currencyIdB" component={RemoveLiquidity} />

              <Route component={RedirectPathToSwapOnly} />
            </Switch>
            <Marginer />
          </BodyWrapper>
        </AppWrapper>
      </Web3ReactManager>
    </ErrorBoundary>
  )
}
