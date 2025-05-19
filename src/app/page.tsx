"use client";

import { useEffect, useState } from "react";
import { PrivateKey, Address } from "@provablehq/sdk";
import { AleoWorkerMessage, AleoAccount } from './worker_types';

// Helper to hash a string to a field-like string (simplified for demo)
// In a real app, use a proper BHP256 hash and ensure it's a valid field representation.
const hashStringToField = (input: string): string => {
  // This is a placeholder. Replace with actual hashing if needed or expect pre-hashed field.
  if (/^\d+field$/.test(input)) return input; // If already looks like a field
  // Simple numeric hash for demo, NOT cryptographically secure or Aleo-valid for all cases.
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return `${Math.abs(hash)}field`; // Example: "12345field"
};

const LOCAL_STORAGE_ACCOUNT_KEY = "aleoDonationAppAccount";

export default function Home() {
  const [account, setAccount] = useState<AleoAccount | null>(null);
  const [isAccountLoaded, setIsAccountLoaded] = useState(false);
  const [executingFunction, setExecutingFunction] = useState<string | null>(null); 
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);

  // --- Mint Token State ---
  const [mintAmount, setMintAmount] = useState<string>("100");
  const [mintAddress, setMintAddress] = useState('');

  // --- Donate State ---
  const [donateTokenRecord, setDonateTokenRecord] = useState<string>(""); // User will paste record string
  const [donateAmount, setDonateAmount] = useState<string>("10");
  const [donateMessage, setDonateMessage] = useState<string>("Hello Aleo!");
  const [donateTimestamp, setDonateTimestamp] = useState<string>("");

  // --- Tax Proof State ---
  const [taxReceiptRecord, setTaxReceiptRecord] = useState<string>(""); // User will paste record string
  const [taxYear, setTaxYear] = useState<string>(new Date().getFullYear().toString());
  const [taxProofResult, setTaxProofResult] = useState('');

  // Program ID (ensure this matches your deployment)
  const PROGRAM_ID = 'private_donation.aleo';
  const FEE = '1'; // Default fee in credits (e.g., 1 credit)

  useEffect(() => {
    // Load account from localStorage on initial mount
    const savedAccountJson = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
    if (savedAccountJson) {
      try {
        const savedAccount = JSON.parse(savedAccountJson);
        if (savedAccount && savedAccount.privateKey && savedAccount.address) {
          setAccount(savedAccount);
          setFeedbackMessage(`Loaded saved account: ${savedAccount.address}`);
          setMintAddress(savedAccount.address);
        }
      } catch (e) {
        console.error("Failed to parse saved account:", e);
        localStorage.removeItem(LOCAL_STORAGE_ACCOUNT_KEY); // Clear corrupted data
      }
    }
    setIsAccountLoaded(true); // Indicate that we've attempted to load the account

    const aleoWorker = new Worker(new URL('./worker.ts', import.meta.url));
    setWorker(aleoWorker);
    
    aleoWorker.onmessage = (event: MessageEvent<AleoWorkerMessage>) => {
      setExecutingFunction(null); // Stop loading indicator for any completed/failed function

      const { type, result, error, transactionId: txId, functionName } = event.data;
      console.log("Page received message from worker:", type, result);

      if (error) {
        setFeedbackMessage(`Error: ${error}`);
        return;
      }

      switch (type) {
        case 'account_generated':
          setAccount(result as AleoAccount);
          localStorage.setItem(LOCAL_STORAGE_ACCOUNT_KEY, JSON.stringify(result));
          setFeedbackMessage(`New account generated & saved! Address: ${result.address}. Private key: ${result.privateKey} (SAVE THIS securely if not already done!)`);
          setMintAddress(result.address);
          break;
        case 'transaction_broadcasted':
          setTransactionId(txId || 'N/A');
          setFeedbackMessage(`Transaction for ${functionName} broadcasted! ID: ${txId}. Monitor explorer for finalization.`);
          // Clear inputs for the successful function, or update records if applicable
          if (functionName === 'mint_tokens') setMintAmount("100");
          if (functionName === 'donate') {
            setDonateTokenRecord("");
            setDonateAmount("10");
            setDonateMessage("Hello Aleo!");
            setDonateTimestamp("");
          }
          if (functionName === 'generate_tax_proof') {
            setTaxReceiptRecord("");
          }
          break;
        case 'error':
          setFeedbackMessage(`Error: ${result}`);
          break;
        case 'worker_loaded':
          setFeedbackMessage((prev) => prev ? `${prev} Aleo worker loaded.` : "Aleo worker loaded successfully.");
          // Try to load saved account on worker load
          loadAccountFromStorage();
          break;
        default:
          setFeedbackMessage(`Received unhandled message type: ${type}`);
      }
    };

    return () => {
      aleoWorker.terminate();
    };
  }, []);

  const generateNewAccount = (overwriteSaved = false) => {
    if (!overwriteSaved && localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY)) {
      if (!confirm("An account is already saved. Overwrite it with a new one?")) {
        return;
      }
    }
    setFeedbackMessage("Generating new Aleo account...");
    setExecutingFunction("generate_account");
    worker?.postMessage({ type: "generate_account" });
  };

  const clearSavedAccount = () => {
    localStorage.removeItem(LOCAL_STORAGE_ACCOUNT_KEY);
    setAccount(null);
    setMintAddress('');
    setFeedbackMessage("Saved account cleared. Generate a new one or refresh.");
  };

  const loadAccountFromStorage = () => {
    const savedAccountJson = localStorage.getItem(LOCAL_STORAGE_ACCOUNT_KEY);
    if (savedAccountJson) {
      const savedAccount = JSON.parse(savedAccountJson);
      setAccount(savedAccount);
      setMintAddress(savedAccount.address);
      setFeedbackMessage('Account loaded from localStorage.');
    } else {
      setFeedbackMessage('No account found in localStorage. Please generate one.');
    }
  };

  const executeGenericTransaction = (functionName: string, inputs: any[], fee?: number) => {
    if (!account) {
      setFeedbackMessage("Please generate or import an account first.");
      return;
    }
    setFeedbackMessage(`Executing ${functionName}...`);
    setExecutingFunction(functionName);
    setTransactionId(null);
    setTaxProofResult(''); // Clear previous proof
    worker?.postMessage({
      type: "execute_transaction",
      payload: {
        privateKeyString: account.privateKey,
        functionName,
        inputs,
        fee: fee || 1, // Increased default fee to 1 credit
      },
    });
  };

  // --- Action Handlers ---
  const handleMintTokens = () => {
    if (!account) {
        setFeedbackMessage("Generate account first"); return;
    }
    const amount = parseInt(mintAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setFeedbackMessage("Invalid mint amount.");
      return;
    }
    const inputs = [
      account.address, // receiver
      `${amount}u64`    // amount
    ];
    executeGenericTransaction("mint_tokens", inputs);
  };

  const handleDonate = () => {
    if (!donateTokenRecord) {
        setFeedbackMessage("Token record string is required for donation."); return;
    }
    const amount = parseInt(donateAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setFeedbackMessage("Invalid donation amount.");
      return;
    }
    if (!donateTimestamp || isNaN(parseInt(donateTimestamp))) {
        setFeedbackMessage("Valid Unix timestamp (seconds) is required for donation."); return;
    }

    // For message_hash, this is a simplification. 
    // In a real app, you'd use a proper cryptographic hash (e.g. BHP256) 
    // and ensure it's correctly formatted as a field element.
    const messageField = hashStringToField(donateMessage);

    const inputs = [
      donateTokenRecord,        // token (as record string)
      `${amount}u64`,           // donation_amount
      messageField,             // message_hash (as field string)
      `${donateTimestamp}u64`   // timestamp_seconds
    ];
    executeGenericTransaction("donate", inputs);
  };

  const handleGenerateTaxProof = () => {
    if (!taxReceiptRecord) {
        setFeedbackMessage("Donation receipt record string is required."); return;
    }
    const year = parseInt(taxYear, 10);
    if (isNaN(year) || year < 2000 || year > 2200) { // Basic year validation
        setFeedbackMessage("Invalid year for tax proof."); return;
    }
    const inputs = [
      taxReceiptRecord, // receipt (as record string)
      `${year}u64`       // year
    ];
    executeGenericTransaction("generate_tax_proof", inputs);
  };

  if (!isAccountLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-b-4 border-primary"></div>
          <p className="mt-4 text-xl text-white">Loading account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-aleo-dark to-gray-900 shadow-lg">
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-aleo-blue">
                <path d="M21 15c0-4.625-3.507-8.441-8-8.941V4h-2v2.059c-4.493.5-8 4.316-8 8.941v2h18v-2Zm-2 0H5c0-3.859 3.141-7 7-7s7 3.141 7 7Z"></path>
                <path d="M3 19h18v2H3z"></path>
              </svg>
              <h1 className="text-2xl font-bold text-white">Private Donation Platform <span className="text-aleo-blue">(Aleo)</span></h1>
            </div>
            
            <div className="mt-4 md:mt-0">
              {account ? (
                <div className="flex items-center space-x-2">
                  <span className="bg-gray-700 px-2 py-1 rounded text-sm text-white">{account.address.substring(0, 8)}...{account.address.substring(account.address.length-8)}</span>
                  <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
                </div>
              ) : (
                <button
                  onClick={() => generateNewAccount(false)}
                  className="btn btn-primary" 
                  disabled={!!executingFunction}
                >
                  {executingFunction === 'generate_account' ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : "Generate Account"}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Feedback Messages */}
      {feedbackMessage && (
        <div className="mx-auto max-w-7xl px-4 py-3 mt-4">
          <div className="rounded-lg bg-aleo-dark border border-aleo-blue p-4 text-sm shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-aleo-blue" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 font-mono text-sm">
                <p className="text-aleo-light">{feedbackMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction ID */}
      {transactionId && (
        <div className="mx-auto max-w-7xl px-4 mt-2">
          <div className="rounded-lg bg-gray-800 p-3 text-sm">
            <div className="flex items-center">
              <span className="text-gray-300 mr-2">Transaction ID:</span>
              <a 
                href={`https://explorer.aleo.org/transaction/${transactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-aleo-blue hover:text-blue-400 underline font-mono truncate"
              >
                {transactionId}
              </a>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-aleo-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Account Management Card */}
          <div className="card-container">
            <div className="card-header flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-aleo-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Account Management</span>
            </div>
            <div className="card-body">
              {account ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium">Address</label>
                    <div className="mt-1 bg-gray-700 p-2 rounded font-mono text-sm break-all text-white">
                      {account.address}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Private Key</label>
                    <div className="mt-1 relative">
                      <div className="bg-gray-700 p-2 rounded font-mono text-xs break-all max-h-20 overflow-y-auto text-white">
                        {account.privateKey}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-90 opacity-0 hover:opacity-100 transition-opacity">
                        <span className="bg-gray-900 text-gray-200 p-1 text-xs rounded">Click to reveal</span>
                      </div>
                    </div>
                    <p className="text-xs text-red-400 mt-1">Save this private key securely! It cannot be recovered.</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={clearSavedAccount} 
                      disabled={!!executingFunction} 
                      className="btn btn-danger"
                    >
                      Clear Account
                    </button>
                    <button 
                      onClick={() => generateNewAccount(true)} 
                      disabled={!!executingFunction}
                      className="btn btn-secondary"
                    >
                      Generate New
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="mb-4">No account found. Generate one to get started.</p>
                  <button 
                    onClick={() => generateNewAccount(false)} 
                    disabled={!!executingFunction}
                    className="btn btn-primary"
                  >
                    Generate New Account
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mint Tokens Card */}
          {account && (
            <div className="card-container">
              <div className="card-header flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>1. Mint Tokens (Test)</span>
              </div>
              <div className="card-body">
                <p className="mb-4">
                  Ensure your account has Aleo testnet credits from a faucet.
                </p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="mintAmount" className="block text-sm font-medium mb-1">
                      Amount (u64)
                    </label>
                    <input 
                      id="mintAmount"
                      type="number" 
                      value={mintAmount} 
                      onChange={(e) => setMintAmount(e.target.value)} 
                      placeholder="e.g., 100"
                      className="input-field w-full"
                      disabled={!!executingFunction}
                    />
                  </div>
                  <button 
                    onClick={handleMintTokens} 
                    disabled={!!executingFunction || !mintAmount}
                    className="btn btn-primary w-full"
                  >
                    {executingFunction === 'mint_tokens' ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Minting...
                      </span>
                    ) : "Mint Tokens"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Donate Card */}
          {account && (
            <div className="card-container">
              <div className="card-header flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                <span className="text-white">2. Make a Private Donation</span>
              </div>
              <div className="card-body">
                <p className="text-white mb-4">
                  You need a token record string (from minting or another source).
                </p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="donateTokenRecord" className="block text-sm font-medium text-white mb-1">
                      Token Record String
                    </label>
                    <textarea 
                      id="donateTokenRecord"
                      value={donateTokenRecord} 
                      onChange={(e) => setDonateTokenRecord(e.target.value)} 
                      placeholder="{ owner: aleo1..., amount: 100u64 }"
                      rows={3}
                      className="input-field w-full resize-none text-white"
                      disabled={!!executingFunction}
                    />
                  </div>
                  <div>
                    <label htmlFor="donateAmount" className="block text-sm font-medium text-white mb-1">
                      Donation Amount (u64)
                    </label>
                    <input 
                      id="donateAmount"
                      type="number" 
                      value={donateAmount} 
                      onChange={(e) => setDonateAmount(e.target.value)} 
                      placeholder="e.g., 10"
                      className="input-field w-full text-white"
                      disabled={!!executingFunction}
                    />
                  </div>
                  <div>
                    <label htmlFor="donateMessage" className="block text-sm font-medium text-white mb-1">
                      Message (will be hashed)
                    </label>
                    <input 
                      id="donateMessage"
                      type="text" 
                      value={donateMessage} 
                      onChange={(e) => setDonateMessage(e.target.value)} 
                      placeholder="Your anonymous message"
                      className="input-field w-full text-white"
                      disabled={!!executingFunction}
                    />
                  </div>
                  <div>
                    <label htmlFor="donateTimestamp" className="block text-sm font-medium text-white mb-1">
                      Timestamp (Unix seconds)
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        id="donateTimestamp"
                        type="number" 
                        value={donateTimestamp} 
                        onChange={(e) => setDonateTimestamp(e.target.value)} 
                        placeholder="e.g., 1678886400"
                        className="input-field w-full text-white"
                        disabled={!!executingFunction}
                      />
                      <button 
                        onClick={() => setDonateTimestamp(Math.floor(Date.now() / 1000).toString())} 
                        disabled={!!executingFunction}
                        className="btn btn-secondary whitespace-nowrap"
                      >
                        Set to Now
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={handleDonate} 
                    disabled={!!executingFunction || !donateTokenRecord || !donateAmount || !donateTimestamp}
                    className="btn btn-primary w-full"
                  >
                    {executingFunction === 'donate' ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Donating...
                      </span>
                    ) : "Donate Privately"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tax Proof Card */}
          {account && (
            <div className="card-container">
              <div className="card-header flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-white">3. Generate Tax Proof</span>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="taxReceiptRecordInput" className="block text-sm font-medium text-white mb-1">
                      Donation Receipt Record
                    </label>
                    <textarea
                      id="taxReceiptRecordInput"
                      rows={4}
                      value={taxReceiptRecord}
                      onChange={(e) => setTaxReceiptRecord(e.target.value)}
                      placeholder="{ owner: aleo1..., donation_id: ..., charity_id: ..., amount: ..., timestamp: ..., message_hash: ..., _nonce: ...group.public }"
                      className="input-field w-full resize-none text-white"
                      disabled={!!executingFunction}
                    />
                    <p className="text-xs text-white mt-1">
                      Paste the complete DonationReceipt record from a successful donation.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="taxYearInput" className="block text-sm font-medium text-white mb-1">
                      Tax Year (u64)
                    </label>
                    <input
                      id="taxYearInput"
                      type="number"
                      value={taxYear}
                      onChange={(e) => setTaxYear(e.target.value)}
                      placeholder="e.g., 2023"
                      className="input-field w-full text-white"
                      disabled={!!executingFunction}
                    />
                  </div>
                  <button 
                    onClick={handleGenerateTaxProof} 
                    disabled={!!executingFunction || !taxReceiptRecord || !taxYear}
                    className="btn btn-primary w-full"
                  >
                    {executingFunction === 'generate_tax_proof' ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Proof...
                      </span>
                    ) : "Generate Tax Proof"}
                  </button>
                </div>

                {/* Tax Proof Result */}
                {taxProofResult && (
                  <div className="mt-4 p-3 bg-gray-700 rounded-lg border border-green-600">
                    <p className="text-sm font-semibold text-green-400 mb-1">Generated Tax Proof Field:</p>
                    <p className="text-xs break-all font-mono text-gray-300">{taxProofResult}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-white text-sm mb-4 md:mb-0">
              <span className="text-aleo-blue font-semibold">Aleo Private Donation Platform</span> - Built with zero-knowledge proofs
            </div>
            <div className="flex space-x-4">
              <a href="https://github.com/AleoHQ" target="_blank" rel="noopener noreferrer" className="text-white hover:text-aleo-blue">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://explorer.aleo.org/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-aleo-blue">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
