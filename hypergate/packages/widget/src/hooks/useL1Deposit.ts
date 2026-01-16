import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useAccount } from 'wagmi';
import { parseAbi } from 'viem';
import { CHAINS, CONTRACTS } from '../config/constants';

const ERC20_ABI = parseAbi([
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)'
]);

export function useL1Deposit() {
    const { switchChainAsync } = useSwitchChain();
    const { address, chainId } = useAccount();
    const { writeContractAsync, data: hash, isPending: isWritePending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Demo Mode State
    const [isSimulating, setIsSimulating] = useState(false);
    const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    const depositToL1 = async (amount: bigint) => {
        try {
            // DEMO MODE BYPASS
            if (address === TEST_ADDRESS) {
                console.log('🔹 Demo Mode: Simulating L1 Deposit...');
                setIsSimulating(true);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate transaction time
                setIsSimulating(false);
                return '0xDEMO_HASH';
            }

            // 1. Ensure we are on HyperEVM
            if (chainId !== CHAINS.HYPEREVM.id) {
                await switchChainAsync({ chainId: CHAINS.HYPEREVM.id });
            }

            // 2. Send USDC to Asset Bridge Precompile
            const txHash = await writeContractAsync({
                address: CONTRACTS.USDC_HYPEREVM as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [CONTRACTS.ASSET_BRIDGE as `0x${string}`, amount],
            });

            return txHash;

        } catch (error) {
            console.error('L1 Deposit Failed:', error);
            setIsSimulating(false);
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
