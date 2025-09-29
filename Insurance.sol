// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;
pragma abicoder v2;

contract FlightInsurance {
    struct Policy {
        string passengerName;
        address payable passengerAddress;
        string flightNumber;
        uint256 flightDate;
        string departureCity;
        string destinationCity;
        string status;  // "purchased"/"claimed"
    }
    
    address payable public insurer;
    uint256 public constant premium = 0.01 ether;
    uint256 public constant indemnity = 0.02 ether;
    
    mapping(address => Policy) private policies;
    address[] private policyHolders;

    struct WeatherVerification {
        bool verified;
        string weatherCondition;
        uint256 verificationTimestamp;
    }

    mapping(address => WeatherVerification) private verifications;

    event PolicyPurchased(address indexed passenger, string flightNumber);
    event WeatherVerified(address indexed passenger, string weatherCondition);
    event IndemnityPaid(address indexed passenger, uint256 amount);
    event ProfitWithdrawn(uint256 amount);

    modifier onlyInsurer() {
        require(msg.sender == insurer, "Caller is not insurer");
        _;
    }

    constructor() payable {
        insurer = payable(msg.sender);
    }

    // ------------------------ Phase 1 ------------------------
    function view_available_policy() public pure returns(string memory) {
        return "Premium: 0.01 ETH, Indemnity: 0.02 ETH, Coverage: Extreme Weather (e.g. Hail/Flood) in departure city";
    }

    function purchase_policy(
        string memory _name,
        string memory _flightNumber,
        uint256 _flightDate,
        string memory _departure,
        string memory _destination
    ) public payable {
        require(msg.value == premium, "Incorrect premium amount");
        require(policies[msg.sender].passengerAddress == address(0), "Policy already exists");

        Policy memory newPolicy = Policy({
            passengerName: _name,
            passengerAddress: payable(msg.sender),
            flightNumber: _flightNumber,
            flightDate: _flightDate,
            departureCity: _departure,
            destinationCity: _destination,
            status: "purchased"
        });

        policies[msg.sender] = newPolicy;
        policyHolders.push(msg.sender);

        emit PolicyPurchased(msg.sender, _flightNumber);
    }

    function view_purchased_policy() public view returns(
        string memory, string memory, uint256, string memory, string memory, string memory
    ) {
        Policy memory p = policies[msg.sender];
        require(p.passengerAddress != address(0), "No policy found");
        return (
            p.passengerName,
            p.flightNumber,
            p.flightDate,
            p.departureCity,
            p.destinationCity,
            p.status
        );
    }

    function view_all_policies() public view onlyInsurer returns(Policy[] memory) {
        Policy[] memory allPolicies = new Policy[](policyHolders.length);
        for(uint256 i = 0; i < policyHolders.length; i++) {
            allPolicies[i] = policies[policyHolders[i]];
        }
        return allPolicies;
    }

    // ------------------------ Phase 2 ------------------------
    function verify(address passenger, string memory weatherCondition) public onlyInsurer {
        require(policies[passenger].passengerAddress != address(0), "Policy not found");
        require(keccak256(bytes(policies[passenger].status)) == keccak256(bytes("purchased")), "Policy already processed");

        verifications[passenger] = WeatherVerification({
            verified: true,
            weatherCondition: weatherCondition,
            verificationTimestamp: block.timestamp
        });

        emit WeatherVerified(passenger, weatherCondition);
    }

    function pay_indemnity(address payable passenger) public onlyInsurer returns(bool) {
        require(policies[passenger].passengerAddress != address(0), "Policy not found");
        require(keccak256(bytes(policies[passenger].status)) == keccak256(bytes("purchased")), "Policy already claimed");
        require(verifications[passenger].verified, "Weather not verified yet");
        require(address(this).balance >= indemnity, "Insufficient contract balance");

        policies[passenger].status = "claimed";
        bool success = passenger.send(indemnity);
        require(success, "Payment failed");

        emit IndemnityPaid(passenger, indemnity);
        return success;
    }

    function view_balance() public view returns(uint256) {
        return address(msg.sender).balance;
    }

    // ------------------------ New Hybrid Model ------------------------

    function calculateRequiredReserve() public view returns (uint256) {
        uint256 openClaims = 0;
        for (uint256 i = 0; i < policyHolders.length; i++) {
            address addr = policyHolders[i];
            if (keccak256(bytes(policies[addr].status)) == keccak256(bytes("purchased"))) {
                openClaims++;
            }
        }
        return openClaims * indemnity;
    }

    function withdrawProfit() public onlyInsurer {
        uint256 reserve = calculateRequiredReserve();
        uint256 balance = address(this).balance;
        uint256 buffer = indemnity; 
        uint256 required = reserve + buffer;
        require(balance > required, "Not enough balance to withdraw");

        uint256 profit = balance - required; // leave enough for all policies + 1
        insurer.transfer(profit);
        emit ProfitWithdrawn(profit);
    }

    function fund() public payable {}

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}