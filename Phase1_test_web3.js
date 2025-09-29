(async () => {
    const addressPath = 'Insurance/contract_address.txt'; 
    const contractAddress = (await remix.call('fileManager', 'getFile', addressPath)).trim();
    const artifactsPath = `browser/Insurance/artifacts/FlightInsurance.json`;
    const line = '-'.repeat(120);

    try {
        const metadata = JSON.parse(await remix.call('fileManager', 'getFile', artifactsPath));
        const accounts = await web3.eth.getAccounts();
        const contract = new web3.eth.Contract(metadata.abi, contractAddress);

        console.log("TEST A: View Available Policy Info");
        await contract.methods.view_available_policy().call()
            .then(res => console.log("Available Policy:", res))
            .catch(err => console.log("Error retrieving policy info:", err.message));
        console.log(line);

        console.log("TEST 0: Initial Balances (No Policies Purchased)");
        const contractBalance = web3.utils.fromWei(await web3.eth.getBalance(contractAddress), 'ether');
        const insurerBalance = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]), 'ether');
        console.log(`Contract Balance: ${contractBalance} ETH`);
        console.log(`Insurer Balance: ${insurerBalance} ETH`);
        console.log(line);


        console.log("TEST 1: Purchase by Passenger 1 (No Withdrawal)");
        try {
            await contract.methods.purchase_policy(
                "John Doe", "AA123", 1681604459, "Denver", "New York"
            ).send({ from: accounts[1], value: web3.utils.toWei('0.01', 'ether') });

            console.log("Policy purchased successfully by Passenger 1");

            const policy1 = await contract.methods.view_purchased_policy().call({ from: accounts[1] });
            console.log("Passenger 1 Policy Details:");
            console.log(`  Passenger: ${policy1[0]}`);
            console.log(`  Flight: ${policy1[1]}`);
            console.log(`  Date: ${new Date(policy1[2] * 1000).toLocaleString()}`);
            console.log(`  Route: ${policy1[3]} → ${policy1[4]}`);
            console.log(`  Status: ${policy1[5]}`);
        } catch (err) {
            console.log("Error purchasing policy (Passenger 1):", err.message);
        }
        console.log(line);


        console.log("Balance After First Purchase (Before Withdrawal)");
        const midContractBalance1 = web3.utils.fromWei(await web3.eth.getBalance(contractAddress), 'ether');
        const midInsurerBalance1 = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]), 'ether');
        console.log(`Contract Balance: ${midContractBalance1} ETH`);
        console.log(`Insurer Balance: ${midInsurerBalance1} ETH`);
        console.log(line);


        console.log("TEST 2: Attempt Duplicate Purchase by Passenger 1");
        await contract.methods.purchase_policy(
            "John Doe", "AA123", 1681604459, "Denver", "New York"
        ).send({ from: accounts[1], value: web3.utils.toWei('0.01', 'ether') })
        .then(() => console.log("Unexpected success in duplicate purchase!"))
        .catch(err => console.log("Expected Error (duplicate purchase):", err.message));
        console.log(line);


        console.log("TEST 3: Incorrect Premium Amount by Passenger 3");
        await contract.methods.purchase_policy(
            "Bob Smith", "CC123", 1681604459, "Dallas", "Miami"
        ).send({ from: accounts[3], value: web3.utils.toWei('0.005', 'ether') })
        .then(() => console.log("Unexpected success with incorrect premium!"))
        .catch(err => console.log("Expected Error (incorrect premium):", err.message));
        console.log(line);


        console.log("TEST 4: Purchase by Passenger 2 and Insurer Withdraws Profit");
        try {
            await contract.methods.purchase_policy(
                "Jonathan Saxon", "BB123", 1681604459, "Austin", "Chicago"
            ).send({ from: accounts[2], value: web3.utils.toWei('0.01', 'ether') });

            console.log("Policy purchased successfully by Passenger 2");

            const policy2 = await contract.methods.view_purchased_policy().call({ from: accounts[2] });
            console.log("Passenger 2 Policy Details:");
            console.log(`  Passenger: ${policy2[0]}`);
            console.log(`  Flight: ${policy2[1]}`);
            console.log(`  Date: ${new Date(policy2[2] * 1000).toLocaleString()}`);
            console.log(`  Route: ${policy2[3]} → ${policy2[4]}`);
            console.log(`  Status: ${policy2[5]}`);
        } catch (err) {
            console.log("Error purchasing policy (Passenger 2):", err.message);
        }

        try {
            await contract.methods.withdrawProfit().send({ from: accounts[0] });
            console.log("Insurer successfully withdrew profit");
        } catch (err) {
            console.log("Error during profit withdrawal:", err.message);
        }
        console.log(line);


        console.log("Balance After Withdrawal");
        const midContractBalance2 = web3.utils.fromWei(await web3.eth.getBalance(contractAddress), 'ether');
        const midInsurerBalance2 = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]), 'ether');
        console.log(`Contract Balance: ${midContractBalance2} ETH`);
        console.log(`Insurer Balance: ${midInsurerBalance2} ETH`);
        console.log(line);


        console.log("TEST 5: Attempt to Withdraw Profit When No Surplus");
        await contract.methods.withdrawProfit().send({ from: accounts[0] })
            .then(() => console.log("Unexpected success withdrawing when no surplus!"))
            .catch(err => console.log("Expected Error (no surplus):", err.message));
        console.log(line);

        console.log("TEST 6: Final Balances");
        const finalContractBalance = web3.utils.fromWei(await web3.eth.getBalance(contractAddress), 'ether');
        const finalInsurerBalance = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]), 'ether');
        const passenger1Balance = web3.utils.fromWei(await web3.eth.getBalance(accounts[1]), 'ether');
        const passenger2Balance = web3.utils.fromWei(await web3.eth.getBalance(accounts[2]), 'ether');
        console.log(`Final Contract Balance: ${finalContractBalance} ETH`);
        console.log(`Final Insurer Balance: ${finalInsurerBalance} ETH`);
        console.log(`Passenger 1 Balance: ${passenger1Balance} ETH`);
        console.log(`Passenger 2 Balance: ${passenger2Balance} ETH`);


        console.log("TEST 7: View Policy for Passenger with No Purchase");
        await contract.methods.view_purchased_policy().call({ from: accounts[3] })
            .then(policy => console.log("Unexpected policy found:", policy))
            .catch(err => console.log("Expected Error (no policy):", err.message));
        console.log(line);
  
        console.log(line);
        console.log("TEST B: View All Purchased Policies (Insurer Only)");
        await contract.methods.view_all_policies().call({ from: accounts[0] })
            .then(res => {
                console.log(`Total Purchased Policies: ${res.length}`);
                res.forEach((p, i) => {
                    console.log(`Policy ${i + 1}:`);
                    console.log(`  Passenger: ${p.passengerName}`);
                    console.log(`  Flight: ${p.flightNumber}`);
                    console.log(`  Date: ${new Date(p.flightDate * 1000).toLocaleString()}`);
                    console.log(`  Route: ${p.departureCity} → ${p.destinationCity}`);
                    console.log(`  Status: ${p.status}`);
                });
            })
            .catch(err => console.log("Error retrieving all policies:", err.message));

        console.log("TEST C: Unauthorized Access to view_all_policies");
        try {
            await contract.methods.view_all_policies().call({ from: accounts[1] });
            console.log("view_all_policies unexpectedly succeeded for non-insurer!");
        } catch (err) {
            console.log("Expected error: Non-insurer cannot call view_all_policies:", err.message);
        }

    } catch (error) {
        console.error("Error during test execution:", error);
    }
})();