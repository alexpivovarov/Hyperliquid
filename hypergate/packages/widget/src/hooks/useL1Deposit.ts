import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useAccount, usePublicClient } from 'wagmi';
import { parseAbi } from 'viem';
import { CHAINS, CONTRACTS } from '../config/constants';

// ERC20 ABI for approval
const ERC20_ABI = parseAbi([
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)'
]);

// CoreDepositWallet ABI (Circle's bridge contract)
// Reference: https://docs.chainstack.com/docs/hyperliquid-bridging-usdc
const CORE_DEPOSIT_WALLET_ABI = parseAbi([
    'function deposit(uint256 amount, uint32 destinationDex) external'
]);

// Destination DEX options for deposit()
// 0 = perps balance, 4294967295 (uint32.max) = spot balance
const DESTINATION_PERPS = 0;

export function useL1Deposit() {
    const { switchChainAsync } = useSwitchChain();
    const { address, chainId } = useAccount();
    const publicClient = usePublicClient();
    const { writeContractAsync, data: hash, isPending: isWritePending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Demo Mode State
    const [isSimulating, setIsSimulating] = useState(false);
    const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    const depositToL1 = async (amount: bigint) => {
        try {
            // DEMO MODE BYPASS
            if (address === TEST_ADDRESS) {
                setIsSimulating(true);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate transaction time
                setIsSimulating(false);
                return '0xDEMO_HASH';
            }

            // 1. Ensure we are on HyperEVM
            if (chainId !== CHAINS.HYPEREVM.id) {
                await switchChainAsync({ chainId: CHAINS.HYPEREVM.id });
            }

            // 2. Check current allowance
            let needsApproval = true;
            if (publicClient && address) {
                try {
                    const allowance = await publicClient.readContract({
                        address: CONTRACTS.USDC_HYPEREVM as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: 'allowance',
                        args: [address as `0x${string}`, CONTRACTS.ASSET_BRIDGE as `0x${string}`]
                    });
                    needsApproval = allowance < amount;
                } catch {
                    // If allowance check fails, proceed with approval
                }
            }

            // 3. Approve USDC to CoreDepositWallet if needed
            if (needsApproval) {
                await writeContractAsync({
                    address: CONTRACTS.USDC_HYPEREVM as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [CONTRACTS.ASSET_BRIDGE as `0x${string}`, amount],
                });
            }

            // 4. Call deposit() on CoreDepositWallet
            // This bridges USDC from HyperEVM to HyperCore (trading account)
            const txHash = await writeContractAsync({
                address: CONTRACTS.ASSET_BRIDGE as `0x${string}`,
                abi: CORE_DEPOSIT_WALLET_ABI,
                functionName: 'deposit',
                args: [amount, DESTINATION_PERPS], // Deposit to perps balance
            });

            return txHash;

        } catch (error: any) {
            setIsSimulating(false);

            // Check for gas errors
            if (error.message?.includes('insufficient funds') || error.message?.includes('gas')) {
                throw new Error('Insufficient HYPE for gas. Please use Gas Refuel.');
            }
            throw error;
        }
    };

    return {
        depositToL1,
        isLoading: isWritePending || isConfirming || isSimulating,
        isSuccess: isSuccess || (address === TEST_ADDRESS && !isSimulating), // Assume success in demo if not loading
        hash
    };
}
