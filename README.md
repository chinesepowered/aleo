# 🔐 AnonyDonate 🔐

> Privacy-preserving charitable donations on Aleo blockchain

![AnonyDonate Banner](https://via.placeholder.com/1200x300)

## 🌟 Overview

AnonyDonate is a decentralized application built on the Aleo blockchain that enables completely private charitable donations while providing cryptographically verifiable proof for tax deduction purposes. By leveraging zero-knowledge proofs, donors can support causes they care about without revealing their identity or donation amounts to anyone except tax authorities when necessary.

## ✨ Key Features

- **🕵️‍♂️ Anonymous Donations**: Make contributions to charities without revealing your identity
- **🔐 Private Amounts**: Donation values remain confidential, known only to you
- **📄 Verifiable Receipts**: Generate cryptographic proof of donations for tax purposes
- **💯 Charity Verification**: Ensure your donations reach legitimate organizations
- **⚡ Low Fees**: Minimal transaction costs compared to traditional donation platforms
- **🔄 Transparent Operation**: Open-source code with privacy by design

## 🛠️ Technology Stack

- **Blockchain**: Aleo (privacy-focused L1 blockchain)
- **Smart Contract**: Written in Leo programming language
- **Frontend**: React.js with Tailwind CSS
- **Wallet Integration**: Compatible with major Aleo wallets
- **Zero-Knowledge Proofs**: For private-yet-verifiable donations

## 📋 How It Works

1. **Connect Wallet**: User connects their Aleo wallet to the application
2. **Select Charity**: Browse and select from verified charitable organizations
3. **Make Donation**: Send funds privately through an Aleo transaction
4. **Receive Receipt**: Get a cryptographic receipt stored in your wallet
5. **Tax Verification**: Generate tax proofs when needed without revealing donation amounts

## 📝 Smart Contract Details

The core functionality is implemented in the `private_donation.leo` smart contract:

- `donate`: Creates anonymous donations and generates private receipts
- `generate_tax_proof`: Produces verifiable proof of donation for tax purposes
- `mint_tokens`: For testing purposes (would be replaced with real token integration)

The contract ensures:
- Donor privacy is maintained
- Donation amounts remain confidential
- Tax authorities can verify legitimacy without seeing specific amounts
- Charities receive funds without knowing donor identities

## 🚀 Getting Started

### Prerequisites

- An Aleo wallet with some tokens
- Node.js and npm installed
- Git for cloning the repository

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/anonydonate.git

# Navigate to the project directory
cd anonydonate

# Install dependencies
npm install

# Start the development server
npm start
```

### Smart Contract Deployment

```bash
# Navigate to the contracts directory
cd contracts

# Build the Leo program
leo build

# Deploy to Aleo testnet
leo deploy private_donation
```

## 📸 Screenshots

<div align="center">
  <img src="https://via.placeholder.com/400x300" alt="Dashboard" width="45%">
  <img src="https://via.placeholder.com/400x300" alt="Donation Process" width="45%">
</div>

<div align="center">
  <img src="https://via.placeholder.com/400x300" alt="Receipt Generation" width="45%">
  <img src="https://via.placeholder.com/400x300" alt="Tax Verification" width="45%">
</div>

## 🔄 Future Development

- **Multi-Charity Support**: Expand beyond the current dummy charity implementation
- **Recurring Donations**: Schedule regular private contributions
- **Charity DAO**: Decentralized governance for charity verification
- **Mobile App**: Native mobile experience for iOS and Android
- **Donation Pooling**: Privacy-enhancing donation aggregation
- **Cross-Chain Integration**: Support for other privacy-focused blockchains

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- Aleo team for building a privacy-preserving blockchain platform
- Hackathon organizers and mentors
- Everyone who contributed to the project

---

<div align="center">
  Made with ❤️ for privacy and charitable giving
</div>
