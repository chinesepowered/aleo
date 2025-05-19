# 🔐 Private Donation Platform 🔐

> Privacy-preserving charitable donations on Aleo blockchain


## 🌟 Overview

Private Donation Platform is a decentralized application built on the Aleo blockchain that enables completely private charitable donations while providing cryptographically verifiable proof for tax deduction purposes. By leveraging zero-knowledge proofs, donors can support causes they care about without revealing their identity or donation amounts to anyone except tax authorities when necessary.

[Leo Smart Contract](https://raw.githubusercontent.com/chinesepowered/aleo/refs/heads/main/contracts/src/main.leo)
[Smart Contract Testnet Deployment](https://testnet.aleoscan.io/program?id=private_donation.aleo)
[Presentation Slides](https://www.canva.com/design/DAGn2nQ80zA/79MByu6oX4ACxLmd8_F_9A/edit)
[Demo Video](https://github.com/chinesepowered/aleo/raw/refs/heads/main/public/demo.mp4)

## 📸 Screenshots

<div align="center">
  <img src="/public/scr1.jpg" alt="Dashboard" width="45%">
  <img src="/public/scr2.jpg" alt="Tax Receipt" width="45%">
</div>

<div align="center">
  <img src="/public/scr3.jpg" alt="Testnet Explorer" width="45%">
  <img src="/public/scr4.jpg" alt="Testnet Explorer" width="45%">
</div>

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
- **Zero-Knowledge Proofs**: For private-yet-verifiable donations

## 📋 How It Works

1. **Wallet**: Ensure wallet has enough ALEO to execute transactions
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


## 🔄 Future Development

- **Multi-Charity Support**: Increase number of charities supported
- **Recurring Donations**: Schedule regular private contributions
- **Charity DAO**: Decentralized governance for charity verification
- **Mobile App**: Native mobile experience for iOS and Android
- **Donation Pooling**: Privacy-enhancing donation aggregation
- **Cross-Chain Integration**: Support for other privacy-focused blockchains

## 🙏 Acknowledgements

- Aleo team for building a privacy-preserving blockchain platform

---

<div align="center">
  Made with ❤️ for privacy and charitable giving
</div>
