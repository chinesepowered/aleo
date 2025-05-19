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

// Point to the local Next.js API proxy route
const ALEO_PROXY_URL = "/api/aleo"; 

// Declare ProgramManager instance variable, to be initialized on first use or based on account
let programManager: ProgramManager | null = null;
let networkClient: AleoNetworkClient | null = null;

// Helper function to get transaction status
async function getTransactionStatus(transactionId: string): Promise<string> {
    let status = "";
    while (status !== "Finalized" && status !== "Rejected" && status !== "Failed") {
        const response = await fetch(`${ALEO_PROXY_URL}/testnet/transaction/${transactionId}`); // Corrected path for status
        try {
            const data = await response.json();
            status = data.status || data.type; // Adapt to actual API response for status
             if (status === 'Accepted') status = 'Finalized'; // Temporary: Treat 'Accepted' as 'Finalized' for simplicity
        } catch (e) {
            console.error("Error parsing transaction status:", e);
            status = "Failed"; // Assume failure if status parsing fails
        }
        if (status !== "Finalized" && status !== "Rejected" && status !== "Failed") {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
        }
    }
    console.log(`Transaction ${transactionId} status: ${status}`);
    return status;
}

self.onmessage = async function (e: MessageEvent<any>) {
    const { type, data } = e.data;

    // Initialize NetworkClient if it hasn't been already
    if (!networkClient) {
        networkClient = new AleoNetworkClient(ALEO_PROXY_URL);
    }

    try {
        if (type === 'generate_account') {
            const newAccount = new Account(); // Creates a new account with a new private key
            const privateKey = newAccount.privateKey();
            const address = newAccount.address();
            postMessage({ type: 'account_generated', result: { privateKey: privateKey.to_string(), address: address.to_string() } });
        } else if (type === 'execute_transaction') {
            const { privateKey: privateKeyString, programId, functionName, inputs, fee } = data;
            
            if (!programId || !functionName || !inputs || !privateKeyString) {
                 postMessage({ type: 'error', result: 'Missing parameters for execute_transaction' });
                 return;
            }

            const aleoAccount = new Account({ privateKey: privateKeyString });
            const aleoPrivateKey = aleoAccount.privateKey(); // Or PrivateKey.from_string(privateKeyString);

            // Initialize ProgramManager with the specific account for this transaction
            // This ensures the record provider is set up for the correct account
            const recordProvider = new NetworkRecordProvider(aleoAccount, networkClient);
            programManager = new ProgramManager(ALEO_PROXY_URL, undefined, recordProvider);
            programManager.setAccount(aleoAccount); // Explicitly set the account for the ProgramManager instance

            const parsedFee = parseFloat(fee);
            if (isNaN(parsedFee)) {
                postMessage({ type: 'error', result: 'Invalid fee amount provided.' });
                return;
            }

            const priorityFee = parsedFee; 
            const privateFee = 0;          

            console.log('Worker: Execution options', { programName: programId, functionName, inputs, priorityFee, privateFeeValue: privateFee });
            
            const transactionId = await programManager.execute({
                programName: programId,
                functionName: functionName,
                inputs: inputs,
                privateKey: aleoPrivateKey,
                priorityFee: priorityFee,
                privateFee: false,
            });

            console.log('Worker: Transaction broadcasted:', transactionId);
            postMessage({ type: 'transaction_broadcasted', transactionId });

            // Optional: Start polling for transaction status
            // getTransactionStatus(transactionId).then(status => {
            //     postMessage({ type: 'transaction_status_updated', transactionId, status });
            // });

        }
    } catch (error) {
        console.error('Worker error:', error);
        postMessage({ type: 'error', result: (error as Error).message });
    }
};

// Expose a simple function to confirm worker is loaded (optional)
postMessage({ type: "worker_loaded" });
