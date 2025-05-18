// Program: private_donation.leo
// Author: Chineseman
// Description: A private donation platform that allows users to make anonymous donations
// while providing verifiable proof of donation for tax purposes.

program private_donation.aleo {
    // Record to represent a token/currency
    record Token {
        // The token owner
        owner: address,
        // The token amount
        amount: u64,
    }

    // Record for a charity's registration
    record CharityRecord {
        // The charity owner/administrator
        owner: address,
        // Charity unique ID
        charity_id: field,
        // Charity name hash (privacy-preserving)
        name_hash: field,
        // Charity category (1: Health, 2: Education, 3: Environment, etc.)
        category: u8,
        // Whether the charity is verified (0: unverified, 1: verified)
        verified: u8,
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

    // Record for charity to track received donations
    record CharityDonation {
        // The charity owner
        owner: address,
        // Donation ID
        donation_id: field,
        // Amount received (visible only to charity)
        amount: u64,
        // Donor address (hashed for privacy)
        donor_hash: field,
        // Timestamp of donation
        timestamp: u64,
    }

    // Public mappings to track aggregate statistics (without revealing individual donations)
    mapping total_donated_per_charity: field => u64;
    mapping total_donors_per_charity: field => u64;
    
    // Mapping for registered charities (charity_id => exists)
    mapping registered_charities: field => u8;

    // Function to register a new charity
    transition register_charity(
        admin: address,
        name_hash: field,
        category: u8,
        verified: u8
    ) -> CharityRecord {
        // Generate a unique charity ID using a hash of inputs
        let charity_id: field = BHP256::hash_to_field(name_hash + category as field);
        
        // Create charity record
        let charity_record: CharityRecord = CharityRecord {
            owner: admin,
            charity_id,
            name_hash,
            category,
            verified,
        };
        
        // Call the finalize block
        self.register_charity_finalize(charity_id);
        
        // Return the charity record to the admin
        return charity_record;
    }
    
    // Finalize block for registering charity
    finalize register_charity_finalize(charity_id: field) {
        // Check if charity already exists
        let exists: u8 = registered_charities.get_or_default(charity_id, 0u8);
        assert_eq(exists, 0u8);
        
        // Register charity in the mapping
        registered_charities.set(charity_id, 1u8);
        
        // Initialize donation statistics
        total_donated_per_charity.set(charity_id, 0u64);
        total_donors_per_charity.set(charity_id, 0u64);
    }

    // Function to make a private donation
    transition donate(
        token: Token,
        charity_id: field,
        donation_amount: u64,
        message_hash: field
    ) -> (Token, DonationReceipt, CharityDonation) {
        // Verify donation amount is valid
        assert(token.amount >= donation_amount);
        
        // Get current block height as timestamp
        let timestamp: u64 = block.height;
        
        // Create a unique donation ID
        let donation_id: field = BHP256::hash_to_field(
            charity_id + self.caller + timestamp as field + donation_amount as field
        );
        
        // Hash donor address for charity record
        let donor_hash: field = BHP256::hash_to_field(self.caller);

        // Update the donor's token record with remaining balance
        let remaining: Token = Token {
            owner: token.owner,
            amount: token.amount - donation_amount,
        };
        
        // Create donation receipt for donor (private)
        let receipt: DonationReceipt = DonationReceipt {
            owner: token.owner,
            donation_id,
            charity_id,
            amount: donation_amount,
            timestamp,
            message_hash,
        };
        
        // Create a record for the charity to claim the donation
        let charity_donation: CharityDonation = CharityDonation {
            owner: get_charity_address(charity_id), // Helper function to get charity address
            donation_id,
            amount: donation_amount,
            donor_hash,
            timestamp,
        };
        
        // Call the finalize block
        self.donate_finalize(charity_id, donation_amount);
        
        return (remaining, receipt, charity_donation);
    }
    
    // Finalize block for donation
    finalize donate_finalize(charity_id: field, donation_amount: u64) {
        // Verify charity exists
        let exists: u8 = registered_charities.get_or_default(charity_id, 0u8);
        assert_eq(exists, 1u8);
        
        // Update total donation statistics
        let current_total: u64 = total_donated_per_charity.get_or_default(charity_id, 0u64);
        total_donated_per_charity.set(charity_id, current_total + donation_amount);
        
        let current_donors: u64 = total_donors_per_charity.get_or_default(charity_id, 0u64);
        total_donors_per_charity.set(charity_id, current_donors + 1u64);
    }

    // Helper to get charity address (in practice, this would look up from a registry)
    function get_charity_address(charity_id: field) -> address {
        // In a real implementation, this would look up the address from a registry
        // For simplicity in this example, we derive it from the charity_id
        // This should be replaced with proper lookup logic
        return address::from_field(charity_id);
    }

    // Function for a charity to claim their donations
    transition claim_donation(
        charity_record: CharityRecord,
        charity_donation: CharityDonation
    ) -> (Token, CharityRecord) {
        // Verify the claimer is the legitimate charity
        assert(charity_record.charity_id == charity_donation.donation_id / 10000000000u64 as field);
        assert(charity_record.owner == charity_donation.owner);
        
        // Create token for the charity with the donated amount
        let claimed_token: Token = Token {
            owner: charity_record.owner,
            amount: charity_donation.amount,
        };
        
        return (claimed_token, charity_record);
    }
    
    // Function to generate a tax deduction proof without revealing the exact amount
    transition generate_tax_proof(
        receipt: DonationReceipt,
        year: u64
    ) -> (DonationReceipt, field) {
        // Verify the receipt belongs to the caller
        assert(receipt.owner == self.caller);
        
        // Extract year from timestamp (simplified approach)
        let donation_year: u64 = receipt.timestamp / 525600u64; // Approximate minutes in a year
        
        // Verify donation was made in the specified year
        assert(donation_year == year);
        
        // Generate a tax proof hash that can be verified without revealing the amount
        let tax_proof: field = BHP256::hash_to_field(
            receipt.donation_id + 
            receipt.charity_id + 
            receipt.amount as field + 
            year as field + 
            self.caller
        );
        
        // Return the original receipt and the tax proof
        return (receipt, tax_proof);
    }
    
    // Function to verify donation for a charity (without revealing donor identity)
    transition verify_donation(
        charity_record: CharityRecord,
        donation_id: field
    ) -> (field, CharityRecord) {
        // Verify the charity record belongs to the caller
        assert(charity_record.owner == self.caller);
        
        // Generate verification proof
        let verification: field = BHP256::hash_to_field(
            donation_id + charity_record.charity_id
        );
        
        return (verification, charity_record);
    }
    
    // Function to get anonymous donation statistics for a charity
    transition get_charity_stats(charity_id: field) -> field {
        // We'll return a field that encodes both the request and identity
        // The actual values can be retrieved through an off-chain mechanism
        let stats_id: field = BHP256::hash_to_field(charity_id + self.caller);
        
        // Call the finalize block
        self.get_charity_stats_finalize(charity_id);
        
        return stats_id;
    }
    
    // Finalize block for getting charity stats
    finalize get_charity_stats_finalize(charity_id: field) {
        // Verify charity exists
        let exists: u8 = registered_charities.get_or_default(charity_id, 0u8);
        assert_eq(exists, 1u8);
        
        // Get total donation amount and donor count
        // These would normally be emitted as events or read by an API
        let _total_amount: u64 = total_donated_per_charity.get_or_default(charity_id, 0u64);
        let _total_donors: u64 = total_donors_per_charity.get_or_default(charity_id, 0u64);
        
        // In a real application, you would emit an event here with the values
        // that could be picked up by an off-chain service
    }
    
    // Function for creating initial tokens (normally this would be handled by a separate token program)
    transition mint_tokens(receiver: address, amount: u64) -> Token {
        // This is a simplified mint function for demonstration
        // In a real application, this would be more carefully controlled
        
        return Token {
            owner: receiver,
            amount: amount,
        };
    }
}