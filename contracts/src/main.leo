// Program: private_donation.leo
// Author: Gemini Assistant & User
// Description: A simplified private donation platform focusing on anonymous donations
// and verifiable tax receipts for a dummy charity.

program private_donation.aleo {
    // Hardcoded dummy charity ID
    const DUMMY_CHARITY_ID: field = 12345field; // Example ID

    // Record to represent a token/currency
    record Token {
        // The token owner
        owner: address,
        // The token amount
        amount: u64,
    }

    // Record for a donation receipt (private to donor)
    record DonationReceipt {
        // The receipt owner (donor)
        owner: address,
        // Donation ID
        donation_id: field,
        // Charity ID that received the donation
        charity_id: field,
        // Amount donated (private)
        amount: u64,
        // Timestamp of donation (can be used for tax filing periods)
        timestamp: u64,
        // Hash of any donation message/notes
        message_hash: field,
    }

    // Function to make a private donation to the dummy charity
    transition donate(
        token: Token,
        donation_amount: u64,
        message_hash: field,
        timestamp_seconds: u64
    ) -> (Token, DonationReceipt) {
        // Verify donation amount is valid
        assert(token.amount >= donation_amount);
        
        // Use the provided timestamp
        // let timestamp: u64 = block.height; // Removed: block.height not directly accessible
        
        // Create a unique donation ID
        let caller_as_field: field = BHP256::hash_to_field(self.caller); // Convert address to field
        let donation_id: field = BHP256::hash_to_field(
            DUMMY_CHARITY_ID + caller_as_field + timestamp_seconds as field + donation_amount as field
        );
        
        // Update the donor's token record with remaining balance
        let remaining: Token = Token {
            owner: token.owner,
            amount: token.amount - donation_amount,
        };
        
        // Create donation receipt for donor (private)
        let receipt: DonationReceipt = DonationReceipt {
            owner: token.owner,
            donation_id,
            charity_id: DUMMY_CHARITY_ID,
            amount: donation_amount,
            timestamp: timestamp_seconds, // Use the input timestamp
            message_hash,
        };
        
        // No finalize block needed for this simplified version
        
        return (remaining, receipt);
    }

    // Function to generate a tax deduction proof without revealing the exact amount
    transition generate_tax_proof(
        receipt: DonationReceipt,
        year: u64
    ) -> (DonationReceipt, field) {
        // Verify the receipt belongs to the caller
        assert(receipt.owner == self.caller);
        
        // Verify the donation was to the dummy charity
        assert(receipt.charity_id == DUMMY_CHARITY_ID);

        // Extract year from timestamp (assuming timestamp is in seconds)
        // This is a rough approximation. For a real application, use a more robust timestamp-to-year conversion.
        let seconds_per_year: u64 = 31536000u64; // (365 days * 24 hours * 60 minutes * 60 seconds)
        let donation_year: u64 = receipt.timestamp / seconds_per_year;
        
        // Verify donation was made in the specified year
        assert(donation_year == year);
        
        // Generate a tax proof hash that can be verified without revealing the amount
        let caller_as_field_for_proof: field = BHP256::hash_to_field(self.caller); // Convert address to field
        let tax_proof: field = BHP256::hash_to_field(
            receipt.donation_id + 
            receipt.charity_id + 
            receipt.amount as field + // The amount is part of the hash but not revealed directly
            year as field + 
            caller_as_field_for_proof
        );
        
        // Return the original receipt and the tax proof
        return (receipt, tax_proof);
    }
    
    // Function for creating initial tokens (for testing purposes)
    transition mint_tokens(receiver: address, amount: u64) -> Token {
        // This is a simplified mint function for demonstration
        return Token {
            owner: receiver,
            amount: amount,
        };
    }
}