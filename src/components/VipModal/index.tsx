import styled from 'styled-components/macro'
import { Trans } from '@lingui/macro'

import { ApplicationModal } from 'state/application/actions'
import { useModalOpen, useVipModalToggle } from 'state/application/hooks'
import { useActiveWeb3React } from 'hooks/web3'
import { useVipStatus, useVipMinimumLdogeHolding } from 'hooks/useVip'
import { LDOGE } from 'constants/tokens'
import { SupportedChainId } from 'constants/chains'
import useTheme from 'hooks/useTheme'
import { useTokenBalance } from 'state/wallet/hooks'
import { NON_VIP_LEGATO_STAKE_V2_TAX, VIP_LEGATO_STAKE_V2_TAX } from '../../constants/misc'

import Confetti from '../Confetti'
import { CardBGImage, DataCard, CardNoise, CardSection } from '../earn/styled'
import { ReactComponent as Close } from 'assets/images/x.svg'
import Modal from '../Modal'
import { RowBetween } from '../Row'
import { CloseIcon, TYPE } from '../../theme'
import CurrencyLogo from '../CurrencyLogo'
import { AutoColumn } from '../Column'
import { LightCard } from '../Card'

const ModalUpper = styled(DataCard)<{ vip: boolean }>`
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
  background: ${({ vip }) => (vip ? 'linear-gradient(to top right, #160ce8, #e100bd)' : 'unset')};
`

const Wrapper = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  margin: 0;
  padding: 0;
  width: 100%;
`

const HeaderRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  padding: 1rem 1rem;
  font-weight: 500;
  color: ${(props) => (props.color === 'blue' ? ({ theme }) => theme.primary1 : 'inherit')};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem;
  `};
`

const UpperSection = styled.div`
  position: relative;

  h5 {
    margin: 0;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    font-weight: 400;
  }

  h5:last-child {
    margin-bottom: 0px;
  }

  h4 {
    margin-top: 0;
    font-weight: 500;
  }
`

const VipSection = styled(AutoColumn)`
  padding: 1rem;
  ${({ theme }) => theme.mediaWidth.upToMedium`padding-bottom: 1.5rem;`};
`

export default function VipModal() {
  const { account, chainId } = useActiveWeb3React()
  const theme = useTheme()
  const vipStatus = useVipStatus()
  const minimumLdogeHolding = useVipMinimumLdogeHolding()
  const ldogeBalance = useTokenBalance(account ?? undefined, chainId ? LDOGE[chainId] : undefined)

  const vipModalOpen = useModalOpen(ApplicationModal.VIP)
  const toggleVipModal = useVipModalToggle()

  function getModalContent() {
    return (
      <UpperSection>
        <ModalUpper vip={vipStatus}>
          <CardBGImage />
          <CardNoise />
          <CardSection gap="md">
            <RowBetween>
              <TYPE.white fontWeight={500}>
                <Trans>VIP Status</Trans>
              </TYPE.white>
              <CloseIcon onClick={toggleVipModal} style={{ zIndex: 99 }} stroke="white" />
            </RowBetween>
            <TYPE.white fontWeight={700} fontSize={vipStatus ? 36 : 34}>
              <Trans>{vipStatus ? "YOU'RE VIP" : "YOU'RE NOT VIP"}</Trans>
            </TYPE.white>
          </CardSection>
        </ModalUpper>
        <VipSection gap="lg">
          <AutoColumn gap="md">
            <TYPE.white fontWeight={500}>
              <Trans>VIP Requirements</Trans>
            </TYPE.white>
            <RowBetween>
              <CurrencyLogo currency={LDOGE[SupportedChainId.MAINNET]} style={{ marginRight: 8 }} />
              <RowBetween>
                <TYPE.white color={theme.text2}>LDOGE holding:</TYPE.white>
                <TYPE.white fontWeight={600} textAlign="right">
                  {ldogeBalance ? ldogeBalance.toFixed(0, { groupSeparator: ',' }) : '-'}
                  {' / '}
                  {minimumLdogeHolding ? minimumLdogeHolding.toFixed(0, { groupSeparator: ',' }) : '-'}
                </TYPE.white>
              </RowBetween>
            </RowBetween>
          </AutoColumn>
          {!vipStatus && (
            <AutoColumn gap="md">
              <TYPE.white fontWeight={500}>
                <Trans>Your Advantages</Trans>
              </TYPE.white>
              <LightCard>
                <AutoColumn gap="md">
                  <RowBetween>
                    <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
                      <Trans>Legato tax on stake / unstake</Trans>
                    </TYPE.black>
                    <TYPE.black textAlign="right" fontSize={14} color={theme.text1}>
                      {NON_VIP_LEGATO_STAKE_V2_TAX.toFixed(0)}%
                    </TYPE.black>
                  </RowBetween>
                </AutoColumn>
              </LightCard>
            </AutoColumn>
          )}
          <AutoColumn gap="md">
            <TYPE.white fontWeight={500}>
              <Trans>{vipStatus ? 'Your Advantages' : 'VIP Advantages'}</Trans>
            </TYPE.white>
            <LightCard>
              <AutoColumn gap="md">
                <RowBetween>
                  <TYPE.black fontSize={14} fontWeight={400} color={theme.text2}>
                    <Trans>Legato tax on stake / unstake</Trans>
                  </TYPE.black>
                  <TYPE.black textAlign="right" fontSize={14} color={theme.text1}>
                    {VIP_LEGATO_STAKE_V2_TAX.toFixed(0)}%
                  </TYPE.black>
                </RowBetween>
              </AutoColumn>
            </LightCard>
          </AutoColumn>
        </VipSection>
      </UpperSection>
    )
  }

  return (
    <Modal isOpen={vipModalOpen} onDismiss={toggleVipModal} minHeight={false} maxHeight={90}>
      <Confetti start={vipStatus} />
      <Wrapper>{getModalContent()}</Wrapper>
    </Modal>
  )
}
