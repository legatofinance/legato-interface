import { createAction } from '@reduxjs/toolkit'

export enum Field {
  CURRENCY_STAKED = 'CURRENCY_STAKED',
  CURRENCY_STAKED_A = 'CURRENCY_STAKED_A',
  CURRENCY_STAKED_B = 'CURRENCY_STAKED_B',
  CURRENCY_REWARD = 'CURRENCY_REWARD',
  POOL_LIFESPAN = 'POOL_LIFESPAN',
}

export const typeReward = createAction<{ typedValue: string }>('stakeV2/typeReward')
export const typePoolLifespan = createAction<{ typedValue: string }>('stakeV2/typePoolLifespan')
export const resetStakeState = createAction<void>('stakeV2/resetStakeState')
