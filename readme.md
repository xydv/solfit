# Solfit

## Blockchain-Powered Fitness Accountability Platform

Solfit is a blockchain-powered fitness challenge platform that allows users to participate in step-based fitness challenges, ensuring transparency, fairness, and security using Solana smart contracts where rewards are distributed on-chain, making the process trustless and tamper-proof.

![solfit program](/images/1.png)

### <div align="center">Solfit Flow Diagram</div>

## 🚀 Features

### 🔒 Secure & Transparent
- All fitness data is validated cryptographically before syncing with the blockchain
- No centralized authority—everything is stored and verified on Solana

### 🎯 Fitness Challenges
- Create custom step-count challenges with entry fees and rewards
- Participants must meet daily step goals to win their share of the prize pool
- Failed participants' stakes get distributed among successful ones

### 🔄 Seamless Health Data Syncing
- Uses Google Fit API (or Health Connect for Android users) for step tracking
- Signed data ensures no cheating or spoofing

### 💰 Reward Distribution
- Rewards are automatically distributed via smart contracts
- Participants who complete challenges get their stake + extra rewards from failed participants

### 📜 Solana-Powered Smart Contracts
- Smart contracts ensure tamper-proof challenge management
- Funds are held securely in on-chain escrow accounts

### 📱 Mobile App
- Built using React Native for a smooth, cross-platform experience
- Users can join challenges, track progress, and withdraw rewards easily

## 🛠 Tech Stack

### Mobile App (React Native)
- Built using React Native for cross-platform support
- Sign In With Solana
- Health Connect Integration for retrieving step data

<table>
  <tr>
    <td align="center">
      <img src="/images/android/1.png" alt="Home Page" width=300 />
    </td>
    <td align="center">
      <img src="/images/android/2.png" alt="Create Challenge" width=300 />
    </td>
    <td align="center">
      <img src="/images/android/3.png" alt="Registered Challenges" width=300 />
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="/images/android/4.png" alt="Completed Challenges" width=300 />
    </td>
    <td align="center">
      <img src="/images/android/5.png" alt="Created Challenges" width=300 />
    </td>
    <td align="center">
      <img src="/images/android/6.png" alt="Challenge Details" width=300 />
    </td>
  </tr>
</table>

### Backend & Smart Contract (Rust, Anchor)
- Solana smart contracts for challenge management

![solfit program](/images/3.png)
- Health data validation using cryptographic signing

![step verification](/images/2.png)

### Blockchain Integration
- Uses Solana blockchain to ensure transparent, immutable challenge tracking
- Smart contracts handle challenge creation, participation, syncing, and rewards

## 📖 How It Works

1. **Create Challenge:** Users create a challenge by setting a step goal, duration, and entry fee amount
2. **Join Challenge:** Participants join by paying the entry fee
3. **Sync Data:** Participants sync their step data daily using Health Connect API (Backend Verification)
4. **Track Progress:** The blockchain records progress, ensuring no cheating
5. **Withdraw Reward:** At the end of the challenge, users who completed the goal win rewards, while failed participants lose their stakes

## 🔗 Getting Started

### 1. Install Dependencies
```bash
yarn install
```

### 2. Run the React Native App
```bash
yarn android
```

### 2. Run the Backend (for Steps Verification)
```bash
pnpx wrangler@latest dev
```

### 3. Deploy Smart Contracts (Rust + Anchor)
```bash
anchor build && anchor deploy
```

## 📢 Future Enhancements

- **Fitbit API Integration** 📡 to support more fitness tracking devices
- **Social Challenges** 🏆 to compete with friends in private groups
