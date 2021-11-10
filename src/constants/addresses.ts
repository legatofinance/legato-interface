import { constructSameAddressMap } from '../utils/constructSameAddressMap'
import { SupportedChainId } from './chains'

type AddressMap = { [chainId: number]: string }

export const LDOGE_ADDRESS: AddressMap = {
  [SupportedChainId.MAINNET]: '0xc32c50fa1854d0c8df9032e5887a57aa84783e8a',
  [SupportedChainId.TESTNET]: '0x0a3e884850c9320bc387123ac7e543229ec3d84d',
}

export const MULTICALL_ADDRESS: AddressMap = {
  [SupportedChainId.MAINNET]: '0xF7bbE3359443565954b0daC61756931581F3699C',
  [SupportedChainId.TESTNET]: '0xa68e07488BA76d92cb510c3ea775826F90558087',
}

export const V2_FACTORY_ADDRESSES: AddressMap = {
  [SupportedChainId.MAINNET]: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
  [SupportedChainId.TESTNET]: '0x6725F303b657a9451d8BA641348b6761A6CC7a17',
}

export const V2_ROUTER_ADDRESS: AddressMap = {
  [SupportedChainId.MAINNET]: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  [SupportedChainId.TESTNET]: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
}

export const STAKING_ROUTER_ADDRESS: AddressMap = {
  [SupportedChainId.MAINNET]: '0xd93D3Ba696271F327F72e90397606B60b0059f24',
  [SupportedChainId.TESTNET]: '0x8d5d89716A126ba954acd66cC04DD9A5Aa380AcC',
}

export const V2_STAKING_ROUTER_ADDRESS: AddressMap = {
  [SupportedChainId.MAINNET]: '0x99ef697cEdA5A143e18A3D0Ffcf9d709c09A32E3',
  [SupportedChainId.TESTNET]: '0x58FCbB467dFcb6bB08E406CaD6cfe495581120A3',
}

export const TIMELOCK_ADDRESS: AddressMap = constructSameAddressMap('0x1a9C8182C09F50C8318d769245beA52c32BE35BC')

export const MERKLE_DISTRIBUTOR_ADDRESS: AddressMap = {
  [SupportedChainId.MAINNET]: '0x090D4613473dEE047c3f2706764f49E0821D256e',
}
export const ARGENT_WALLET_DETECTOR_ADDRESS: AddressMap = {
  [SupportedChainId.MAINNET]: '0xeca4B0bDBf7c55E9b7925919d03CbF8Dc82537E8',
}

export const ENS_REGISTRAR_ADDRESSES: AddressMap = {}
export const SOCKS_CONTROLLER_ADDRESSES: AddressMap = {
  [SupportedChainId.MAINNET]: '0x65770b5283117639760beA3F867b69b3697a91dd',
}
