import { createReducer } from '@reduxjs/toolkit'
import {
  Field,
  resetStakeState,
  typeReward,
  typePoolLifespan,
  typeMinimumStaked,
  typeMinimumTotalStaked,
  typeMinimumStakers,
} from './actions'

export interface StakeState {
  readonly typedRewardValue: string
  readonly typedPoolLifespanValue: string
  readonly typedMinimumStakedValue: string
  readonly typedMinimumTotalStakedValue: string
  readonly typedMinimumStakersValue: string
}

export const initialState: StakeState = {
  typedRewardValue: '',
  typedPoolLifespanValue: '',
  typedMinimumStakedValue: '',
  typedMinimumTotalStakedValue: '',
  typedMinimumStakersValue: '',
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
    .addCase(typeMinimumStaked, (state, { payload: { typedValue } }) => {
      return {
        ...state,
        typedMinimumStakedValue: typedValue,
      }
    })
    .addCase(typeMinimumTotalStaked, (state, { payload: { typedValue } }) => {
      return {
        ...state,
        typedMinimumTotalStakedValue: typedValue,
      }
    })
    .addCase(typeMinimumStakers, (state, { payload: { typedValue } }) => {
      return {
        ...state,
        typedMinimumStakersValue: typedValue,
      }
    })
)
