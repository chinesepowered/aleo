"use client";

import Image from "next/image";
import styles from "./page.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { PrivateKey, Address } from "@provablehq/sdk"; // Fixed: AleoAddress to Address

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

export default function Home() {
  const [account, setAccount] = useState<AleoAccount | null>(null);
  const [executingFunction, setExecutingFunction] = useState<string | null>(null); 
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string | null>(null);

  // --- Mint Token State ---
  const [mintAmount, setMintAmount] = useState<string>("100");

  // --- Donate State ---
  const [donateTokenRecord, setDonateTokenRecord] = useState<string>(""); // User will paste record string
  const [donateAmount, setDonateAmount] = useState<string>("10");
  const [donateMessage, setDonateMessage] = useState<string>("Hello Aleo!");
  const [donateTimestamp, setDonateTimestamp] = useState<string>("");

  // --- Tax Proof State ---
  const [taxReceiptRecord, setTaxReceiptRecord] = useState<string>(""); // User will paste record string
  const [taxYear, setTaxYear] = useState<string>(new Date().getFullYear().toString());


  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(new URL("worker.ts", import.meta.url));
    
    workerRef.current.onmessage = (event: MessageEvent) => {
      const { type, result } = event.data;
      console.log("Page received message from worker:", type, result);

      setExecutingFunction(null); // Stop loading indicator for any completed/failed function

      if (type === "worker_loaded") {
        setFeedbackMessage("Aleo worker loaded successfully.");
      }
      else if (type === "account_generated") {
        setAccount(result);
        setFeedbackMessage(`Account generated! Address: ${result.address}. Private key: ${result.privateKey} (SAVE THIS securely!)`);
      } 
      else if (type === "transaction_broadcasted") {
        setTransactionId(result.transactionId);
        setFeedbackMessage(`Transaction for ${result.functionName} broadcasted! ID: ${result.transactionId}. Monitor explorer for finalization.`);
        // Clear inputs for the successful function, or update records if applicable
        if (result.functionName === 'mint_tokens') setMintAmount("100");
        if (result.functionName === 'donate') {
            setDonateTokenRecord("");
            setDonateAmount("10");
            setDonateMessage("Hello Aleo!");
            setDonateTimestamp("");
        }
        if (result.functionName === 'generate_tax_proof') {
            setTaxReceiptRecord("");
        }
      } 
      // Add handlers for transaction_finalized, transaction_failed if implementing polling in worker
      else if (type === "error") {
        setFeedbackMessage(`Error: ${result}`);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const generateAccount = () => {
    setFeedbackMessage("Generating Aleo account...");
    setExecutingFunction("generate_account");
    workerRef.current?.postMessage({ type: "generate_account" });
  };

  const executeGenericTransaction = (functionName: string, inputs: any[], fee?: number) => {
    if (!account) {
      setFeedbackMessage("Please generate or import an account first.");
      return;
    }
    setFeedbackMessage(`Executing ${functionName}...`);
    setExecutingFunction(functionName);
    setTransactionId(null);
    workerRef.current?.postMessage({
      type: "execute_transaction",
      payload: {
        privateKeyString: account.privateKey,
        functionName,
        inputs,
        fee: fee || 0.1, // Default fee, adjust as necessary
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
              <p><strong>Private Key:</strong> <small>{account.privateKey}</small> <em>(Store securely!)</em></p>
            </div>
          ) : (
            <button onClick={generateAccount} disabled={!!executingFunction}>
              {executingFunction === 'generate_account' ? "Generating..." : "Generate New Aleo Account"}
            </button>
          )}
        </div>

        {/* Mint Tokens */}
        {account && (
          <div className={styles.card}>
            <h2>1. Mint Tokens (Test)</h2>
            <p>Mint new tokens to your account. You will need to copy the output Token record from the explorer for the next step.</p>
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

        {/* Generate Tax Proof */}
        {account && (
          <div className={styles.card}>
            <h2>3. Generate Tax Proof</h2>
            <p>You need a donation receipt record string (from a successful donation).</p>
            <div>
              <label>Donation Receipt Record String: </label>
              <textarea 
                value={taxReceiptRecord} 
                onChange={(e) => setTaxReceiptRecord(e.target.value)} 
                placeholder="{ owner: aleo1..., donation_id: ..., charity_id: ..., amount: ..., timestamp: ..., message_hash: ... }"
                rows={4}
                disabled={!!executingFunction}
              />
            </div>
            <div>
              <label>Tax Year (e.g., 2023): </label>
              <input 
                type="number" 
                value={taxYear} 
                onChange={(e) => setTaxYear(e.target.value)} 
                placeholder="YYYY"
                disabled={!!executingFunction}
              />
            </div>
            <button onClick={handleGenerateTaxProof} disabled={!!executingFunction || !taxReceiptRecord || !taxYear}>
              {executingFunction === 'generate_tax_proof' ? "Generating Proof..." : "Generate Tax Proof"}
            </button>
            {/* The tax proof itself (a field) will be in the transaction output on the explorer */}
          </div>
        )}
      </div>
    </main>
  );
}
