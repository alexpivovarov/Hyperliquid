import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock functions - defined before vi.mock
const mockSwitchChainAsync = vi.fn();
const mockWriteContractAsync = vi.fn();
const mockUseAccount = vi.fn();
const mockUseWriteContract = vi.fn();
const mockUseWaitForTransactionReceipt = vi.fn();

// Mock wagmi hooks
vi.mock('wagmi', () => ({
    useWriteContract: () => mockUseWriteContract(),
    useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
    useSwitchChain: () => ({
        switchChainAsync: mockSwitchChainAsync,
    }),
    useAccount: () => mockUseAccount(),
}));

vi.mock('viem', () => ({
    parseAbi: vi.fn((abi) => abi),
}));

vi.mock('../config/constants', () => ({
    CHAINS: {
        HYPEREVM: { id: 998 },
    },
    CONTRACTS: {
        USDC_HYPEREVM: '0xUSDC_ADDRESS',
        ASSET_BRIDGE: '0xASSET_BRIDGE_ADDRESS',
    },
}));

// Import after mocks are set up
import { useL1Deposit } from './useL1Deposit';

const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const REGULAR_ADDRESS = '0x1234567890123456789012345678901234567890';

describe('useL1Deposit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Default mock implementations
        mockUseAccount.mockReturnValue({
            address: REGULAR_ADDRESS,
            chainId: 998,
        });

        mockUseWriteContract.mockReturnValue({
            writeContractAsync: mockWriteContractAsync,
            data: undefined,
            isPending: false,
        });

        mockUseWaitForTransactionReceipt.mockReturnValue({
            isLoading: false,
            isSuccess: false,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initial state', () => {
        it('should return depositToL1 function', () => {
            const { result } = renderHook(() => useL1Deposit());
            expect(typeof result.current.depositToL1).toBe('function');
        });

        it('should have isLoading as false initially', () => {
            const { result } = renderHook(() => useL1Deposit());
            expect(result.current.isLoading).toBe(false);
        });

        it('should have hash as undefined initially', () => {
            const { result } = renderHook(() => useL1Deposit());
            expect(result.current.hash).toBeUndefined();
        });
    });

    describe('demo mode', () => {
        beforeEach(() => {
            mockUseAccount.mockReturnValue({
                address: TEST_ADDRESS,
                chainId: 998,
            });
        });

        it('should simulate deposit in demo mode and return demo hash', async () => {
            const { result } = renderHook(() => useL1Deposit());

            let depositPromise: Promise<string | undefined>;
            act(() => {
                depositPromise = result.current.depositToL1(BigInt(1000000));
            });

            // Fast-forward through the 3-second simulation
            await act(async () => {
                vi.advanceTimersByTime(3000);
            });

            const hash = await depositPromise!;
            expect(hash).toBe('0xDEMO_HASH');
        });

        it('should not call writeContractAsync in demo mode', async () => {
            const { result } = renderHook(() => useL1Deposit());

            act(() => {
                result.current.depositToL1(BigInt(1000000));
            });

            await act(async () => {
                vi.advanceTimersByTime(3000);
            });

            expect(mockWriteContractAsync).not.toHaveBeenCalled();
        });

        it('should not call switchChainAsync in demo mode', async () => {
            const { result } = renderHook(() => useL1Deposit());

            act(() => {
                result.current.depositToL1(BigInt(1000000));
            });

            await act(async () => {
                vi.advanceTimersByTime(3000);
            });

            expect(mockSwitchChainAsync).not.toHaveBeenCalled();
        });

        it('should report isSuccess true for demo mode when not simulating', () => {
            const { result } = renderHook(() => useL1Deposit());
            // In demo mode, isSuccess should be true when not simulating
            expect(result.current.isSuccess).toBe(true);
        });
    });

    describe('real deposit flow', () => {
        it('should call writeContractAsync with correct parameters', async () => {
            const expectedTxHash = '0xabcdef1234567890';
            mockWriteContractAsync.mockResolvedValue(expectedTxHash);

            const { result } = renderHook(() => useL1Deposit());

            const amount = BigInt(5000000); // 5 USDC
            let txHash: string | undefined;

            await act(async () => {
                txHash = await result.current.depositToL1(amount);
            });

            expect(mockWriteContractAsync).toHaveBeenCalledWith({
                address: '0xUSDC_ADDRESS',
                abi: expect.any(Array),
                functionName: 'transfer',
                args: ['0xASSET_BRIDGE_ADDRESS', amount],
            });
            expect(txHash).toBe(expectedTxHash);
        });

        it('should switch chain if not on HyperEVM', async () => {
            mockUseAccount.mockReturnValue({
                address: REGULAR_ADDRESS,
                chainId: 1, // Ethereum mainnet, not HyperEVM
            });

            mockSwitchChainAsync.mockResolvedValue(undefined);
            mockWriteContractAsync.mockResolvedValue('0xhash');

            const { result } = renderHook(() => useL1Deposit());

            await act(async () => {
                await result.current.depositToL1(BigInt(1000000));
            });

            expect(mockSwitchChainAsync).toHaveBeenCalledWith({ chainId: 998 });
        });

        it('should not switch chain if already on HyperEVM', async () => {
            mockWriteContractAsync.mockResolvedValue('0xhash');

            const { result } = renderHook(() => useL1Deposit());

            await act(async () => {
                await result.current.depositToL1(BigInt(1000000));
            });

            expect(mockSwitchChainAsync).not.toHaveBeenCalled();
        });

        it('should return the transaction hash from writeContractAsync', async () => {
            const expectedHash = '0x1234567890abcdef';
            mockWriteContractAsync.mockResolvedValue(expectedHash);

            const { result } = renderHook(() => useL1Deposit());

            let txHash: string | undefined;
            await act(async () => {
                txHash = await result.current.depositToL1(BigInt(1000000));
            });

            expect(txHash).toBe(expectedHash);
        });
    });

    describe('error handling', () => {
        it('should throw gas error with user-friendly message for insufficient funds', async () => {
            mockWriteContractAsync.mockRejectedValue(new Error('insufficient funds for gas'));

            const { result } = renderHook(() => useL1Deposit());

            await expect(
                act(async () => {
                    await result.current.depositToL1(BigInt(1000000));
                })
            ).rejects.toThrow('Insufficient HYPE for gas. Please use Gas Refuel.');
        });

        it('should throw gas error with user-friendly message for gas-related errors', async () => {
            mockWriteContractAsync.mockRejectedValue(new Error('gas estimation failed'));

            const { result } = renderHook(() => useL1Deposit());

            await expect(
                act(async () => {
                    await result.current.depositToL1(BigInt(1000000));
                })
            ).rejects.toThrow('Insufficient HYPE for gas. Please use Gas Refuel.');
        });

        it('should re-throw non-gas errors as-is', async () => {
            const originalError = new Error('User rejected transaction');
            mockWriteContractAsync.mockRejectedValue(originalError);

            const { result } = renderHook(() => useL1Deposit());

            await expect(
                act(async () => {
                    await result.current.depositToL1(BigInt(1000000));
                })
            ).rejects.toThrow('User rejected transaction');
        });

        it('should handle chain switch errors', async () => {
            mockUseAccount.mockReturnValue({
                address: REGULAR_ADDRESS,
                chainId: 1, // Wrong chain
            });

            mockSwitchChainAsync.mockRejectedValue(new Error('Chain switch rejected'));

            const { result } = renderHook(() => useL1Deposit());

            await expect(
                act(async () => {
                    await result.current.depositToL1(BigInt(1000000));
                })
            ).rejects.toThrow('Chain switch rejected');
        });

        it('should handle errors without message property', async () => {
            mockWriteContractAsync.mockRejectedValue({ code: 'UNKNOWN_ERROR' });

            const { result } = renderHook(() => useL1Deposit());

            await expect(
                act(async () => {
                    await result.current.depositToL1(BigInt(1000000));
                })
            ).rejects.toBeDefined();
        });
    });

    describe('loading states', () => {
        it('should reflect isPending from writeContract', () => {
            mockUseWriteContract.mockReturnValue({
                writeContractAsync: mockWriteContractAsync,
                data: undefined,
                isPending: true,
            });

            const { result } = renderHook(() => useL1Deposit());
            expect(result.current.isLoading).toBe(true);
        });

        it('should reflect isLoading from waitForTransactionReceipt', () => {
            mockUseWaitForTransactionReceipt.mockReturnValue({
                isLoading: true,
                isSuccess: false,
            });

            const { result } = renderHook(() => useL1Deposit());
            expect(result.current.isLoading).toBe(true);
        });

        it('should combine loading states correctly', () => {
            mockUseWriteContract.mockReturnValue({
                writeContractAsync: mockWriteContractAsync,
                data: undefined,
                isPending: false,
            });
            mockUseWaitForTransactionReceipt.mockReturnValue({
                isLoading: false,
                isSuccess: false,
            });

            const { result } = renderHook(() => useL1Deposit());
            expect(result.current.isLoading).toBe(false);
        });

        it('should reflect isSuccess from waitForTransactionReceipt', () => {
            mockUseWaitForTransactionReceipt.mockReturnValue({
                isLoading: false,
                isSuccess: true,
            });

            const { result } = renderHook(() => useL1Deposit());
            expect(result.current.isSuccess).toBe(true);
        });
    });

    describe('transaction hash', () => {
        it('should expose hash from writeContract data', () => {
            const expectedHash = '0xabc123def456';
            mockUseWriteContract.mockReturnValue({
                writeContractAsync: mockWriteContractAsync,
                data: expectedHash,
                isPending: false,
            });

            const { result } = renderHook(() => useL1Deposit());
            expect(result.current.hash).toBe(expectedHash);
        });

        it('should return undefined hash when no transaction has been made', () => {
            mockUseWriteContract.mockReturnValue({
                writeContractAsync: mockWriteContractAsync,
                data: undefined,
                isPending: false,
            });

            const { result } = renderHook(() => useL1Deposit());
            expect(result.current.hash).toBeUndefined();
        });
    });

    describe('amount handling', () => {
        it('should handle small amounts correctly', async () => {
            mockWriteContractAsync.mockResolvedValue('0xhash');

            const { result } = renderHook(() => useL1Deposit());
            const smallAmount = BigInt(1); // 0.000001 USDC

            await act(async () => {
                await result.current.depositToL1(smallAmount);
            });

            expect(mockWriteContractAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    args: ['0xASSET_BRIDGE_ADDRESS', smallAmount],
                })
            );
        });

        it('should handle large amounts correctly', async () => {
            mockWriteContractAsync.mockResolvedValue('0xhash');

            const { result } = renderHook(() => useL1Deposit());
            const largeAmount = BigInt('100000000000'); // 100,000 USDC

            await act(async () => {
                await result.current.depositToL1(largeAmount);
            });

            expect(mockWriteContractAsync).toHaveBeenCalledWith(
                expect.objectContaining({
                    args: ['0xASSET_BRIDGE_ADDRESS', largeAmount],
                })
            );
        });
    });
});
