import styled from 'styled-components/macro'

import { ButtonPrimary } from '../../components/Button'
import { AutoColumn } from 'components/Column'

const Wrapper = styled.div`
  padding-top: 12px;
`

export default function Review() {
  return (
    <Wrapper>
      <AutoColumn gap="lg">
        <p>this is a test</p>
      </AutoColumn>
    </Wrapper>
  )
}
