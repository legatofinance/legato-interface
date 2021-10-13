import { createReducer } from '@reduxjs/toolkit'
import { Field, resetStakeState, typeReward, typePoolLifespan } from './actions'

export interface StakeState {
  readonly typedRewardValue: string
  readonly typedPoolLifespanValue: string
}

export const initialState: StakeState = {
  typedRewardValue: '',
  typedPoolLifespanValue: '',
}

export default createReducer<StakeState>(initialState, (builder) =>
  builder
    .addCase(resetStakeState, () => initialState)
    .addCase(typeReward, (state, { payload: { typedValue } }) => {
      return {
        ...state,
        typedRewardValue: typedValue,
      }
    })
    .addCase(typePoolLifespan, (state, { payload: { typedValue } }) => {
      return {
        ...state,
        typedPoolLifespanValue: typedValue,
      }
    })
)
