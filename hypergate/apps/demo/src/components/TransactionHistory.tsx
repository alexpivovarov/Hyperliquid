import { useEffect, useState, useCallback } from 'react';
import type { Deposit } from '@hypergate/widget';

interface TransactionHistoryProps {
    userAddress: string;
    onNotification?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const STATUS_CONFIG = {
    PENDING: { label: 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: '⏳' },
    BRIDGING: { label: 'Bridging', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: '🌉' },
    DEPOSITING: { label: 'Depositing', color: 'text-purple-400', bg: 'bg-purple-400/10', icon: '💰' },
    COMPLETED: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-400/10', icon: '✓' },
    FAILED: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-400/10', icon: '✕' },
} as const;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export function TransactionHistory({ userAddress, onNotification }: TransactionHistoryProps) {
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    const fetchDeposits = useCallback(async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/deposits/user/${userAddress}?limit=10`
            );
            const data = await response.json();

            if (data.success && data.data) {
                const newDeposits = data.data.deposits || data.data;

                // Check for status changes and notify
                if (deposits.length > 0 && onNotification) {
                    newDeposits.forEach((newDep: Deposit) => {
                        const oldDep = deposits.find(d => d.id === newDep.id);
                        if (oldDep && oldDep.status !== newDep.status) {
                            if (newDep.status === 'COMPLETED') {
                                onNotification(`Deposit of $${newDep.destinationAmount} completed!`, 'success');
                            } else if (newDep.status === 'FAILED') {
                                onNotification(`Deposit failed: ${newDep.errorMessage || 'Unknown error'}`, 'error');
                            }
                        }
                    });
                }

                setDeposits(newDeposits);
                setError(null);
            }
        } catch (err) {
            console.error('Failed to fetch deposits:', err);
            setError('Failed to load transaction history');
        } finally {
            setLoading(false);
        }
    }, [userAddress, deposits, onNotification]);

    // Initial fetch and polling
    useEffect(() => {
        fetchDeposits();
        const interval = setInterval(fetchDeposits, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, [fetchDeposits]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatAmount = (amount: string) => {
        const num = parseFloat(amount);
        return num.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const truncateHash = (hash: string) => {
        return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
    };

    const getExplorerUrl = (hash: string, chain: string) => {
        const explorers: Record<string, string> = {
            ethereum: 'https://etherscan.io/tx/',
            arbitrum: 'https://arbiscan.io/tx/',
            optimism: 'https://optimistic.etherscan.io/tx/',
            base: 'https://basescan.org/tx/',
            hyperevm: 'https://explorer.hyperliquid.xyz/tx/',
        };
        const baseUrl = explorers[chain.toLowerCase()] || explorers.ethereum;
        return `${baseUrl}${hash}`;
    };

    if (loading && deposits.length === 0) {
        return (
            <div className="w-full border border-white/10 rounded-xl bg-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="divide-y divide-white/5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-20 bg-white/10 rounded animate-pulse" />
                                    <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
                                </div>
                                <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                                <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error && deposits.length === 0) {
        return (
            <div className="w-full p-4 border border-white/10 rounded-xl bg-white/5">
                <div className="text-center">
                    <div className="text-gray-400 text-sm mb-2">Unable to load transaction history</div>
                    <button
                        onClick={() => { setLoading(true); fetchDeposits(); }}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    if (deposits.length === 0) {
        return (
            <div className="w-full p-4 border border-white/10 rounded-xl bg-white/5 text-center text-gray-400 text-sm">
                No transactions yet. Start your first bridge above!
            </div>
        );
    }

    const displayDeposits = expanded ? deposits : deposits.slice(0, 3);

    return (
        <div className="w-full border border-white/10 rounded-xl bg-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Transaction History</h3>
                <div className="flex items-center gap-2">
                    {loading && (
                        <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className="text-xs text-gray-500">{deposits.length} transactions</span>
                </div>
            </div>

            <div className="divide-y divide-white/5">
                {displayDeposits.map((deposit) => {
                    const status = STATUS_CONFIG[deposit.status];
                    return (
                        <div
                            key={deposit.id}
                            className="px-4 py-3 hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                                        {status.icon} {status.label}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {deposit.sourceChain}
                                    </span>
                                </div>
                                <span className="text-sm font-medium text-white">
                                    {formatAmount(deposit.destinationAmount || deposit.sourceAmount)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{formatDate(deposit.createdAt)}</span>
                                <div className="flex items-center gap-2">
                                    {deposit.bridgeTxHash && (
                                        <a
                                            href={getExplorerUrl(deposit.bridgeTxHash, deposit.sourceChain)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-400 hover:text-purple-300 transition-colors"
                                        >
                                            Bridge: {truncateHash(deposit.bridgeTxHash)}
                                        </a>
                                    )}
                                    {deposit.depositTxHash && (
                                        <a
                                            href={getExplorerUrl(deposit.depositTxHash, 'hyperevm')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-400 hover:text-purple-300 transition-colors"
                                        >
                                            L1: {truncateHash(deposit.depositTxHash)}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {deposit.status === 'FAILED' && deposit.errorMessage && (
                                <div className="mt-2 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
                                    {deposit.errorMessage}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {deposits.length > 3 && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full px-4 py-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-white/5 transition-colors border-t border-white/5"
                >
                    {expanded ? 'Show less' : `Show ${deposits.length - 3} more`}
                </button>
            )}
        </div>
    );
}

export default TransactionHistory;
