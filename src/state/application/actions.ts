import { createAction } from '@reduxjs/toolkit'

export type PopupContent = {
  txn: {
    hash: string
    success: boolean
    summary?: string
  }
}

export enum ApplicationModal {
  WALLET,
  SETTINGS,
  ADDRESS_CLAIM,
  MENU,
  DELEGATE,
  VOTE,
  POOL_OVERVIEW_OPTIONS,
  ARBITRUM_OPTIONS,
  VIP,
}

export const updateChainId = createAction<{ chainId: number | null }>('application/updateChainId')
export const updateBlockNumber = createAction<{ chainId: number; blockNumber: number }>('application/updateBlockNumber')
export const setOpenModal = createAction<ApplicationModal | null>('application/setOpenModal')
export const addPopup =
  createAction<{ key?: string; removeAfterMs?: number | null; content: PopupContent }>('application/addPopup')
export const removePopup = createAction<{ key: string }>('application/removePopup')
