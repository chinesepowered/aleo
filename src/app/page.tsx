"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { PrivateKey, Address } from "@provablehq/sdk"; // Fixed: AleoAddress to Address
import { AleoWorkerMessage, AleoAccount } from './worker_types'; // Assuming types are in worker_types.ts

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

interface AleoAccount {
  privateKey: string;
  address: string;
}

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
    return <main className={styles.main}><p>Loading account...</p></main>; // Or a proper loading spinner
  }

  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <h1>Private Donation Platform (Aleo)</h1>
        {feedbackMessage && <p className={styles.feedback}>{feedbackMessage}</p>}
        {transactionId && (
          <p>
            Last Tx ID: {" "}
            <a 
              href={`https://explorer.aleo.org/transaction/${transactionId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {transactionId}
            </a>
          </p>
        )}
      </div>

      <div className={styles.grid}>
        {/* Account Management */}
        <div className={styles.card}>
          <h2>Account</h2>
          {account ? (
            <div>
              <p><strong>Address:</strong> {account.address}</p>
              <p><strong>Private Key:</strong> <small>{account.privateKey}</small></p>
              <button onClick={clearSavedAccount} disabled={!!executingFunction} style={{backgroundColor: '#f44336'}}>
                Clear Saved Account
              </button>
              <button onClick={() => generateNewAccount(true)} disabled={!!executingFunction} style={{marginLeft: '10px'}}>
                Generate New (Overwrite)
              </button>
            </div>
          ) : (
            <button onClick={() => generateNewAccount(false)} disabled={!!executingFunction}>
              {executingFunction === 'generate_account' ? "Generating..." : "Generate and Save New Account"}
            </button>
          )}
        </div>

        {/* Mint Tokens */}
        {account && (
          <div className={styles.card}>
            <h2>1. Mint Tokens (Test)</h2>
            <p>Ensure your account (<strong>{account.address}</strong>) has Aleo testnet credits from a faucet.</p>
            <div>
              <label>Amount (u64): </label>
              <input 
                type="number" 
                value={mintAmount} 
                onChange={(e) => setMintAmount(e.target.value)} 
                placeholder="e.g., 100"
                disabled={!!executingFunction}
              />
            </div>
            <button onClick={handleMintTokens} disabled={!!executingFunction || !mintAmount}>
              {executingFunction === 'mint_tokens' ? "Minting..." : "Mint Tokens"}
            </button>
          </div>
        )}

        {/* Donate */}
        {account && (
          <div className={styles.card}>
            <h2>2. Make a Private Donation</h2>
            <p>You need a token record string (from minting or another source).</p>
            <div>
              <label>Token Record String: </label>
              <textarea 
                value={donateTokenRecord} 
                onChange={(e) => setDonateTokenRecord(e.target.value)} 
                placeholder="{ owner: aleo1..., amount: 100u64 }"
                rows={3}
                disabled={!!executingFunction}
              />
            </div>
            <div>
              <label>Donation Amount (u64): </label>
              <input 
                type="number" 
                value={donateAmount} 
                onChange={(e) => setDonateAmount(e.target.value)} 
                placeholder="e.g., 10"
                disabled={!!executingFunction}
              />
            </div>
            <div>
              <label>Message (will be hashed): </label>
              <input 
                type="text" 
                value={donateMessage} 
                onChange={(e) => setDonateMessage(e.target.value)} 
                placeholder="Your anonymous message"
                disabled={!!executingFunction}
              />
            </div>
            <div>
              <label>Timestamp (Unix seconds): </label>
              <input 
                type="number" 
                value={donateTimestamp} 
                onChange={(e) => setDonateTimestamp(e.target.value)} 
                placeholder="e.g., 1678886400"
                disabled={!!executingFunction}
              />
              <button onClick={() => setDonateTimestamp(Math.floor(Date.now() / 1000).toString())} disabled={!!executingFunction}>
                Set to Now
              </button>
            </div>
            <button onClick={handleDonate} disabled={!!executingFunction || !donateTokenRecord || !donateAmount || !donateTimestamp}>
              {executingFunction === 'donate' ? "Donating..." : "Donate Privately"}
            </button>
          </div>
        )}

        {/* Generate Tax Proof Section */}
        {account && (
          <div className="w-full max-w-lg p-6 bg-gray-800 rounded-xl shadow-xl space-y-4">
            <h2 className="text-2xl font-semibold text-center text-yellow-400">3. Generate Tax Proof</h2>
            <div>
              <label htmlFor="taxReceiptRecordInput" className="block text-sm font-medium mb-1">Donation Receipt Record (Full String):</label>
              <textarea
                id="taxReceiptRecordInput"
                rows={6}
                value={taxReceiptRecord}
                onChange={(e) => setTaxReceiptRecord(e.target.value)}
                placeholder="{ owner: aleo1..., donation_id: ..., charity_id: ..., amount: ..., timestamp: ..., message_hash: ..., _nonce: ...group.public }"
                className="input-field w-full"
                aria-describedby="receiptRecordHelp"
              />
              <p id="receiptRecordHelp" className="text-xs text-gray-500 mt-1">
                Paste the complete DonationReceipt record string (output of a successful donate transaction).
              </p>
            </div>
            <div>
              <label htmlFor="taxYearInput" className="block text-sm font-medium mb-1">Tax Year (u64):</label>
              <input
                type="number"
                id="taxYearInput"
                value={taxYear}
                onChange={(e) => setTaxYear(e.target.value)}
                placeholder="e.g., 2023"
                className="input-field"
              />
            </div>
            <button 
              onClick={() => {
                if (!taxReceiptRecord) {
                  setFeedbackMessage("Error: Donation Receipt Record string is required.");
                  return;
                }
                if (!taxYear) {
                  setFeedbackMessage("Error: Tax Year is required.");
                  return;
                }
                executeGenericTransaction('generate_tax_proof', [taxReceiptRecord, `${taxYear}u64`]);
              }} 
              disabled={!!executingFunction || !account || !taxReceiptRecord || !taxYear}
              className="btn btn-primary w-full"
            >
              {executingFunction === 'generate_tax_proof' ? "Generating Proof..." : "Generate Tax Proof"}
            </button>
            {taxProofResult && (
              <div className="mt-4 p-3 bg-gray-700 rounded">
                <p className="text-sm font-semibold text-green-300">Generated Tax Proof Field:</p>
                <p className="text-xs break-all text-gray-300">{taxProofResult}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
