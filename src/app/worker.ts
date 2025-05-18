import {
  Account,
  AleoNetworkClient,
  ProgramManager,
  PrivateKey,
  initThreadPool,
  NetworkRecordProvider
} from "@provablehq/sdk";

// Initialize the thread pool for wasm operations
await initThreadPool();

// Define the deployed program ID
const PROGRAM_ID = "private_donation.aleo"; // Make sure this matches your deployed program name

// Aleo Testnet3 API endpoint
const ALEO_TESTNET_API_URL = "https://api.explorer.provable.com/v1/testnet"; 


// Helper function to get transaction status
async function getTransactionStatus(transactionId: string): Promise<string> {
    let status = "";
    while (status !== "Finalized" && status !== "Rejected" && status !== "Failed") {
        const response = await fetch(`${ALEO_TESTNET_API_URL}/transaction/${transactionId}/status`);
        const data = await response.json();
        status = data.status;
        if (status !== "Finalized" && status !== "Rejected" && status !== "Failed") {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before polling again
        }
    }
    return status;
}


onmessage = async function (e) {
  const { type, payload } = e.data;

  try {
    if (type === "generate_account") {
      const privateKey = new PrivateKey();
      postMessage({ type: "account_generated", result: { privateKey: privateKey.to_string(), address: privateKey.to_address().to_string() } });
    } else if (type === "execute_transaction") {
      const { privateKeyString, functionName, inputs, fee } = payload;
      
      if (!privateKeyString || !PROGRAM_ID || !functionName || !inputs) {
        postMessage({ type: "error", result: "Missing required parameters for execution." });
        return;
      }

      const userPrivateKey = PrivateKey.from_string(privateKeyString);
      const userAccount = new Account({ privateKey: userPrivateKey.to_string() });

      const networkClient = new AleoNetworkClient(ALEO_TESTNET_API_URL);
      const recordProvider = new NetworkRecordProvider(userAccount, networkClient);

      const programManager = new ProgramManager(ALEO_TESTNET_API_URL, undefined, recordProvider);
      programManager.setAccount(userAccount);
      
      console.log(`Worker: Executing ${PROGRAM_ID}/${functionName} with inputs:`, inputs);

      // The SDK's execute method handles building, broadcasting, and waiting for the transaction.
      // Attempting single object argument structure based on persistent linter error
      const transactionId = await programManager.execute({
        program: PROGRAM_ID, // Corrected from programID to program based on linter feedback
        functionName: functionName,
        inputs: inputs,
        transactionFee: fee || 0.1, 
        privateKey: userPrivateKey, 
        broadcastOnly: false 
      });
      
      postMessage({ type: "transaction_broadcasted", result: { transactionId, functionName } });

      // Optional: Poll for transaction status (can also be done on the frontend)
      // const status = await getTransactionStatus(transactionId);
      // if (status === "Finalized") {
      //    const transaction = await networkClient.getTransaction(transactionId);
      //    postMessage({ type: "transaction_finalized", result: { transactionId, transaction, functionName } });
      // } else {
      //    postMessage({ type: "transaction_failed", result: { transactionId, status, functionName } });
      // }

    }
  } catch (error) {
    console.error("Worker error:", error);
    postMessage({ type: "error", result: (error as Error).message });
  }
};

// Expose a simple function to confirm worker is loaded (optional)
postMessage({ type: "worker_loaded" });
