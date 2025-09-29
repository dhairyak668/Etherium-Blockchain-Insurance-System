# System Design Document: Flight Insurance Smart Contract System

---

## Author
Name: Dhairya Kachalia

## Overview

This system implements a blockchain-based decentralized flight insurance platform on Ethereum using smart contracts, web3.js, and live external weather data. It allows passengers to purchase flight delay/cancellation insurance based on extreme weather conditions at the departure city. The system supports manual, file-based, and fully automated weather verification via OpenWeatherMap API.

---

## System Components

| Component                  | Description                                                                    |
| -------------------------- | ------------------------------------------------------------------------------ |
| `Insurance.sol`            | Solidity smart contract for managing policies, verification, and payouts       |
| `Phase1_test_web3.js`      | JS script to test policy purchase, error handling, and insurer withdrawal      |
| `Phase2_test_web3.js`      | JS script to test weather.txt-based verification and payouts                   |
| `Phase3_test_web3.js`      | JS script using OpenWeatherMap API to auto-verify weather conditions           |
| `Weather_API_Test_web3.js` | Lightweight script to test API response and weather condition mapping          |
| `BalanceCheck_web3.js`     | Utility script to check wallet and contract balances and view passenger policy |
| `contract_address.txt`     | Stores the deployed contract address for consistent access across scripts      |
| `weather.txt`              | File containing sample weather data for Phase 2 verification                   |

---

## Architecture Diagram (Text Version)

```
+------------------+           +-------------------+           +-------------------------+
| Remix IDE (JS)   +---------->+ Smart Contract     +<--------->+ Blockchain (Ethereum VM) |
| (Phase 1/2/3)    |           | (Insurance.sol)    |           +-------------------------+
+------------------+           +-------------------+
       |                            ^
       v                            |
OpenWeatherMap API (Phase 3)       |
       |                            |
       v                            v
+------------------+        +--------------------------+
| Weather.txt file +------->+  verify()/pay_indemnity() |
+------------------+        +--------------------------+
```

---

## Workflow Description

### Phase 1: Policy Purchase & Insurer Withdrawal

* Passenger calls `purchase_policy()` with correct premium
* Policy is stored in mapping
* Insurer can withdraw profit while keeping required buffer for indemnities
* These are also functions `view_purchased_policy()` for the policy buyer account to view their purchased policy details
* `view_all_policies()` can only be called by the insurer account to view all the purchased policies.

### Phase 2: Manual File-Based Weather Verification

* JS script reads `weather.txt` and parses events
* Each policy is compared to the corresponding weather entry (by date and city)
* If extreme weather (hail/flood), `verify()` and `pay_indemnity()` are triggered

### Phase 3: Auto Weather Verification with API

* JS script fetches current weather for each departure city using OpenWeatherMap API
* If the live condition matches qualifying weather (rain, flood, snow, thunderstorm), the contract is auto-verified and indemnity paid
* System logs API result, transaction outcome, and balance updates

---

## Smart Contract Design (`Insurance.sol`)

### Key Data Structures:

```solidity
struct Policy {
  string passengerName;
  address passengerAddress;
  string flightNumber;
  uint256 flightDate;
  string departureCity;
  string destinationCity;
  string status; // purchased, claimed
}
```

### Important Functions:

* `purchase_policy(...)`
* `view_purchased_policy()`
* `view_all_policies()` (onlyInsurer)
* `verify(address, condition)`
* `pay_indemnity(address)`
* `withdrawProfit()` (ensures buffer for active + 1 policy)
* `fund()` to add ETH to contract balance

---

## Test Strategy & Coverage

### Phase 1:

* Policy purchase success 
* Duplicate policy error 
* Incorrect premium error 
* Withdraw profit 
* Unauthorized view\_all\_policies() 

### Phase 2:

* Weather match and payout 
* Weather does not match 
* No weather found for city 
* Final balance changes after payout 

### Phase 3:

* API weather match and payout 
* Live policy added before verification 
* Contract balance updates 

---

## Security & Validation

* Access control via `onlyInsurer` modifier
* `require()` guards for duplicate policy, invalid state
* Contract cannot withdraw all ETH (always leaves 1 indemnity buffer)

---

## Limitations & Future Work

* Requires proper file address configuration
* contract address is acquired from the contract_address.txt file
* weather api needed

---

## Appendix

### Sample Weather API Response:

```json
{
  "weather": [
    { "main": "Rain", "description": "light rain" }
  ],
  "dt": 1681516800,
  "name": "Ames"
}
```

### Sample Policy Creation Call (Phase 1)

```js
await contract.methods.purchase_policy(
  "John Doe", "AA123", 1681516800, "Denver", "New York"
).send({ from: accounts[1], value: web3.utils.toWei("0.01", "ether") });
```

---

