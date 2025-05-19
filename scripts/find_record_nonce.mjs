import { AleoNetworkClient, ViewKey, RecordCiphertext } from '@provablehq/sdk';
import { strict as assert } from 'assert';
// import fs from 'fs'; // No longer needed
// import util from 'util'; // No longer needed

// // Create a writable stream to a log file // No longer needed
// const logFile = fs.createWriteStream('nonce_script_output.txt', { flags: 'w' }); // No longer needed
// const logStdout = process.stdout; // No longer needed

// // Redirect console.log and console.error to the file and the original stdout // No longer needed
// console.log = function() { // No longer needed
//   logFile.write(util.format.apply(null, arguments) + '\\\\n'); // No longer needed
//   logStdout.write(util.format.apply(null, arguments) + '\\\\n'); // No longer needed
// }; // No longer needed
// console.error = function() { // No longer needed
//   logFile.write(util.format.apply(null, arguments) + '\\\\n'); // No longer needed
//   logStdout.write(util.format.apply(null, arguments) + '\\\\n'); // No longer needed
// }; // No longer needed


// Configuration
// The AleoNetworkClient will typically append /testnet or similar network paths itself.
const ALEO_API_BASE_URL = 'https://api.explorer.provable.com/v1'; 

async function findRecordNonce(viewKeyString, transactionId) {
  if (!viewKeyString) {
    console.error('Error: View key is required.');
    console.log('Usage: node scripts/find_record_nonce.js <viewKeyString> <transactionId>');
    return;
  }
  if (!transactionId) {
    console.error('Error: Transaction ID is required.');
    console.log('Usage: node scripts/find_record_nonce.js <viewKeyString> <transactionId>');
    return;
  }

  console.log(`Attempting to find and decrypt records for transaction ID: ${transactionId}`);
  console.log(`Using View Key starting with: ${viewKeyString.substring(0, 15)}...`);

  try {
    // Initialize with the base URL
    const networkClient = new AleoNetworkClient(ALEO_API_BASE_URL);
    const viewKey = ViewKey.from_string(viewKeyString);

    console.log('Fetching transaction details...');
    // The getTransaction method will construct the full path including /testnet/transaction/...
    const transaction = await networkClient.getTransaction(transactionId);

    if (!transaction) {
      console.error(`Error: Transaction ${transactionId} not found.`);
      return;
    }

    // console.log("Full transaction object:", JSON.stringify(transaction, null, 2)); // Re-comment this for normal use

    if (transaction.execution && transaction.execution.transitions) {
      console.log(`Found ${transaction.execution.transitions.length} transition(s) in the transaction.`);
      let foundAndDecryptedRecords = 0;
      for (let i = 0; i < transaction.execution.transitions.length; i++) {
        const transition = transaction.execution.transitions[i];
        console.log(`\n--- Transition #${i} ---`);
        console.log(`  ID: ${transition.id || 'N/A'}`);
        console.log(`  Program: ${transition.program}`);
        console.log(`  Function: ${transition.function_name || 'N/A'}`);
        console.log(`  Finalize: ${JSON.stringify(transition.finalize, null, 2) || 'N/A'}`);

        if (transition.outputs && transition.outputs.length > 0) {
          console.log(`  Found ${transition.outputs.length} output(s) in this transition.`);
          for (let j = 0; j < transition.outputs.length; j++) {
            const output = transition.outputs[j];
            console.log(`  Output #${j}:`);
            console.log(`    ID: ${output.id || 'N/A'}`);
            console.log(`    Type: ${output.type}`);
            console.log(`    Value: ${String(output.value).substring(0, 60)}...`);
            
            if (output.type === 'record' && output.value) {
              console.log(`    Attempting to decrypt record ciphertext: ${String(output.value).substring(0, 30)}...`);
              try {
                const recordCiphertext = RecordCiphertext.fromString(output.value);
                const decryptedRecord = viewKey.decrypt(recordCiphertext);

                if (decryptedRecord) {
                    console.log("\n  🎉 Successfully Decrypted Record! 🎉");
                    console.log("  -----------------------------------");
                    console.log(`  Owner: ${decryptedRecord.owner().to_string()}`);

                    const dataEntries = decryptedRecord.data();
                    let dataString = "{ ";
                    if (dataEntries && typeof dataEntries.entries === 'function') {
                        for (const [key, value] of dataEntries.entries()) {
                            dataString += `${key}: ${value.to_string()}, `;
                        }
                        dataString = dataString.replace(/, $/, "") + " }";
                    } else {
                        dataString = "[Could not parse data entries]";
                    }
                    console.log(`  Data: ${dataString}`);

                    console.log(`  Nonce: ${decryptedRecord.nonce().to_string()}`);
                    console.log(`  Checksum: ${decryptedRecord.checksum().to_string()}`);
                    console.log("  -----------------------------------\n");
                    foundAndDecryptedRecords++;
                } else {
                    console.log(`    Decryption of record output #${j} did not yield a result (possibly not owned or malformed).`);
                }

              } catch (decryptionError) {
                 console.log(`    Failed to decrypt record output #${j}: Not owned by this view key or invalid record.`);
                 console.error("    Decryption error details:", decryptionError.message, decryptionError.stack);
              }
            } else if (output.type === 'future') {
                console.log(`  Output #${j} is a future: ${JSON.stringify(output.value)}`);
            } else if (output.type === 'public') {
                console.log(`  Output #${j} is public: ${output.value}`);
            }
          }
        } else {
          console.log('  No outputs in this transition.');
        }
      }
      if (foundAndDecryptedRecords === 0) {
          console.log('\nNo records in this transaction could be decrypted with the provided view key. This might also indicate that the target record is in a different transition than expected, or the SDK is encountering an issue.');
      }
    } else {
      console.error('Error: Transaction execution details or transitions not found in the response.');
    }

  } catch (error) {
    console.error('\nAn error occurred:');
    if (error.response && error.response.data) {
        console.error('API Error Response:', JSON.stringify(error.response.data, null, 2));
    } else {
        console.error(error);
    }
  }
}

const args = process.argv.slice(2);
const viewKeyArg = args[0];
const transactionIdArg = args[1];

findRecordNonce(viewKeyArg, transactionIdArg); 