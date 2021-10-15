import { createAction } from '@reduxjs/toolkit'

export enum Field {
  CURRENCY_STAKED = 'CURRENCY_STAKED',
  CURRENCY_STAKED_A = 'CURRENCY_STAKED_A',
  CURRENCY_STAKED_B = 'CURRENCY_STAKED_B',
  CURRENCY_REWARD = 'CURRENCY_REWARD',
  POOL_LIFESPAN = 'POOL_LIFESPAN',
  MINIMUM_STAKED = 'MINIMUM_STAKED',
  MINIMUM_TOTAL_STAKED = 'MINIMUM_TOTAL_STAKED',
}

export const typeReward = createAction<{ typedValue: string }>('stakeV2/typeReward')
export const typePoolLifespan = createAction<{ typedValue: string }>('stakeV2/typePoolLifespan')
export const typeMinimumStaked = createAction<{ typedValue: string }>('stakeV2/typeMinimumStaked')
export const typeMinimumTotalStaked = createAction<{ typedValue: string }>('stakeV2/typeMinimumTotalStaked')
export const typeMinimumStakers = createAction<{ typedValue: string }>('stakeV2/typeMinimumStakers')
export const resetStakeState = createAction<void>('stakeV2/resetStakeState')
