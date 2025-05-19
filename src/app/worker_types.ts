export interface AleoAccount {
  address: string;
  privateKey: string;
}

export interface AleoWorkerMessageData {
  type: string;
  result?: AleoAccount | string | any; // Can be account, transaction ID, error message, or other data
  error?: string;
  transactionId?: string;
  functionName?: string; // To identify which function call this message relates to
  // Add other specific fields if needed
}

export interface AleoWorkerMessage {
  type: 'account_generated' | 'transaction_broadcasted' | 'transaction_finalized' | 'transaction_status_updated' | 'error' | 'worker_loaded';
  result?: AleoAccount | string | any; // Can be account, transaction ID, error message, or other data
  error?: string;
  transactionId?: string;
  functionName?: string; // To identify which function call this message relates to
} 