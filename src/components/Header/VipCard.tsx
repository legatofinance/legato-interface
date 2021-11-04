import styled from 'styled-components/macro'

import { useVipModalToggle } from 'state/application/hooks'
import { useVipStatus } from 'hooks/useVip'

import VipBadge from 'assets/images/vip-badge.png'
import VipModal from '../VipModal'

const StyledVipBadge = styled.img<{ vip: boolean }>`
  cursor: pointer;
  width: 38px;
  border-radius: 12px;
  border: 2px ${({ theme }) => theme.bg0} solid;
  margin-right: 8px;
  ${({ vip }) => !vip && 'filter: grayscale(1);'}
`

export default function VipCard() {
  const vipStatus = useVipStatus()
  const toggleVipModal = useVipModalToggle()

  return (
    <>
      <StyledVipBadge onClick={toggleVipModal} src={VipBadge} vip={vipStatus} />
      <VipModal />
    </>
  )
}
