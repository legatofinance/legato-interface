import styled from 'styled-components/macro'
import { AutoColumn } from '../Column'

import uFlying from '../../assets/images/flying.png'
import uForest from '../../assets/images/forest.png'
import uUrban from '../../assets/images/urban.png'
import noise from '../../assets/images/noise.png'

export const DataCard = styled(AutoColumn)<{ disabled?: boolean }>`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #160ce8 0%, #e100bd 200%);
  border-radius: 12px;
  width: 100%;
  position: relative;
  overflow: hidden;
`

export enum CardBGImageAtmosphere {
  FOREST = 'FOREST',
  URBAN = 'URBAN',
  FLYING = 'FLYING',
}

export const CardBGImage = styled.span<{ desaturate?: boolean; atmosphere?: CardBGImageAtmosphere }>`
  ${({ atmosphere }) => {
    switch (atmosphere ?? CardBGImageAtmosphere.URBAN) {
      case CardBGImageAtmosphere.FOREST:
        return `background: url(${uForest})`
      case CardBGImageAtmosphere.URBAN:
        return `background: url(${uUrban})`
      case CardBGImageAtmosphere.FLYING:
        return `background: url(${uFlying})`
    }
  }};
  width: 1000px;
  height: 600px;
  position: absolute;
  border-radius: 12px;
  opacity: 0.4;
  top: -100px;
  left: -100px;
  transform: rotate(-15deg);
  user-select: none;
  ${({ desaturate }) => desaturate && `filter: saturate(0)`}
`

export const CardNoise = styled.span`
  background: url(${noise});
  background-size: cover;
  mix-blend-mode: overlay;
  border-radius: 12px;
  width: 100%;
  height: 100%;
  opacity: 0.15;
  position: absolute;
  top: 0;
  left: 0;
  user-select: none;
`

export const CardSection = styled(AutoColumn)<{ disabled?: boolean }>`
  padding: 1rem;
  z-index: 1;
  opacity: ${({ disabled }) => disabled && '0.4'};
`

export const Break = styled.div`
  width: 100%;
  background-color: rgba(255, 255, 255, 0.2);
  height: 1px;
`
