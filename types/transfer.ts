export type TransferStatus =
    | "draft"   
    | "awaiting signature"
    | "pending"
    | "confirmed"
    | "rejected"
    | "failed";


export interface Transfer {
    id: string;

    senderAddress: `0x${string}`;
    recipientAddress: `0x${string}`;

    amount: string;
    chainId: string;
    assetSymbol: string;

    status: TransferStatus;

    transactionHash?: `0x${string}`;

    createdAt: number;
    confirmedAt?: number;
}