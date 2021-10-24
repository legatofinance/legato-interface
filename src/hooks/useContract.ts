import { Contract } from '@ethersproject/contracts'
import { abi as LDOGE_ABI } from '@uniswap/governance/build/Uni.json'
import { abi as MERKLE_DISTRIBUTOR_ABI } from '@uniswap/merkle-distributor/build/MerkleDistributor.json'
import { abi as IUniswapV2PairABI } from '@uniswap/v2-core/build/IUniswapV2Pair.json'
import { abi as IUniswapV2Router02ABI } from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import { abi as MulticallABI } from '@uniswap/v3-periphery/artifacts/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json'

import STAKING_ROUTER_ABI from 'abis/staking-router.json'
import V2_STAKING_ROUTER_ABI from 'abis/v2-staking-router.json'
import ARGENT_WALLET_DETECTOR_ABI from 'abis/argent-wallet-detector.json'
import ENS_PUBLIC_RESOLVER_ABI from 'abis/ens-public-resolver.json'
import ENS_ABI from 'abis/ens-registrar.json'
import ERC20_ABI from 'abis/erc20.json'
import ERC20_BYTES32_ABI from 'abis/erc20_bytes32.json'
import WETH_ABI from 'abis/weth.json'
import EIP_2612 from 'abis/eip_2612.json'

import {
  STAKING_ROUTER_ADDRESS,
  V2_STAKING_ROUTER_ADDRESS,
  ARGENT_WALLET_DETECTOR_ADDRESS,
  MERKLE_DISTRIBUTOR_ADDRESS,
  MULTICALL_ADDRESS,
  V2_ROUTER_ADDRESS,
  ENS_REGISTRAR_ADDRESSES,
} from 'constants/addresses'
import { useMemo } from 'react'
import { UniswapInterfaceMulticall } from 'types/v3'
import { getContract } from 'utils'
import { Erc20, ArgentWalletDetector, EnsPublicResolver, EnsRegistrar, Weth } from '../abis/types'
import { LDOGE, WETH9_EXTENDED } from '../constants/tokens'
import { useActiveWeb3React } from './web3'

// returns null on errors
export function useContract<T extends Contract = Contract>(
  addressOrAddressMap: string | { [chainId: number]: string } | undefined,
  ABI: any,
  withSignerIfPossible = true
): T | null {
  const { library, account, chainId } = useActiveWeb3React()

  return useMemo(() => {
    if (!addressOrAddressMap || !ABI || !library || !chainId) return null
    let address: string | undefined
    if (typeof addressOrAddressMap === 'string') address = addressOrAddressMap
    else address = addressOrAddressMap[chainId]
    if (!address) return null
    try {
      return getContract(address, ABI, library, withSignerIfPossible && account ? account : undefined)
    } catch (error) {
      console.error('Failed to get contract', error)
      return null
    }
  }, [addressOrAddressMap, ABI, library, chainId, withSignerIfPossible, account]) as T
}

export function useTokenContract(tokenAddress?: string, withSignerIfPossible?: boolean) {
  return useContract<Erc20>(tokenAddress, ERC20_ABI, withSignerIfPossible)
}

export function useWETHContract(withSignerIfPossible?: boolean) {
  const { chainId } = useActiveWeb3React()
  return useContract<Weth>(chainId ? WETH9_EXTENDED[chainId]?.address : undefined, WETH_ABI, withSignerIfPossible)
}

export function useArgentWalletDetectorContract() {
  return useContract<ArgentWalletDetector>(ARGENT_WALLET_DETECTOR_ADDRESS, ARGENT_WALLET_DETECTOR_ABI, false)
}

export function useENSRegistrarContract(withSignerIfPossible?: boolean) {
  return useContract<EnsRegistrar>(ENS_REGISTRAR_ADDRESSES, ENS_ABI, withSignerIfPossible)
}

export function useENSResolverContract(address: string | undefined, withSignerIfPossible?: boolean) {
  return useContract<EnsPublicResolver>(address, ENS_PUBLIC_RESOLVER_ABI, withSignerIfPossible)
}

export function useBytes32TokenContract(tokenAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(tokenAddress, ERC20_BYTES32_ABI, withSignerIfPossible)
}

export function useEIP2612Contract(tokenAddress?: string): Contract | null {
  return useContract(tokenAddress, EIP_2612, false)
}

export function usePairContract(pairAddress?: string, withSignerIfPossible?: boolean): Contract | null {
  return useContract(pairAddress, IUniswapV2PairABI, withSignerIfPossible)
}

export function useV2RouterContract(): Contract | null {
  return useContract(V2_ROUTER_ADDRESS, IUniswapV2Router02ABI, true)
}

export function useMulticall2Contract() {
  return useContract<UniswapInterfaceMulticall>(MULTICALL_ADDRESS, MulticallABI, false) as UniswapInterfaceMulticall
}

export function useMerkleDistributorContract() {
  return useContract(MERKLE_DISTRIBUTOR_ADDRESS, MERKLE_DISTRIBUTOR_ABI, true)
}

export function useUniContract() {
  const { chainId } = useActiveWeb3React()
  return useContract(chainId ? LDOGE[chainId]?.address : undefined, LDOGE_ABI, true)
}

export function useStakingContract(withSignerIfPossible?: boolean) {
  return useContract(STAKING_ROUTER_ADDRESS, STAKING_ROUTER_ABI, withSignerIfPossible)
}

export function useV2StakingContract(withSignerIfPossible?: boolean) {
  return useContract(V2_STAKING_ROUTER_ADDRESS, V2_STAKING_ROUTER_ABI, withSignerIfPossible)
}
