// Script to check passenger balance and policy status
(async () => {
    const addressPath = 'Insurance/contract_address.txt'; // adjust path if needed
    const contractAddress = (await remix.call('fileManager', 'getFile', addressPath)).trim()
    const artifactsPath = `browser/Insurance/artifacts/FlightInsurance.json`;
    
    try {
        console.log('Checking balance and policy status...');

        const metadata = JSON.parse(await remix.call('fileManager', 'getFile', artifactsPath));
        const accounts = await web3.eth.getAccounts();
        const contract = new web3.eth.Contract(metadata.abi, contractAddress);

        // 🏦 Get contract's ETH balance
        const contractBalanceWei = await web3.eth.getBalance(contractAddress);
        const contractBalanceEth = web3.utils.fromWei(contractBalanceWei, 'ether');
        console.log(`Contract Balance: ${contractBalanceEth} ETH`);

        // 👤 Check passenger wallet balance
        const passengerBalanceWei = await web3.eth.getBalance(accounts[1]);
        const passengerBalanceEth = web3.utils.fromWei(passengerBalanceWei, 'ether');
        console.log(`Passenger [accounts[1]] Wallet Balance: ${passengerBalanceEth} ETH`);

        // 💼 Check insurer wallet balance
        const insurerBalanceWei = await web3.eth.getBalance(accounts[0]);
        const insurerBalanceEth = web3.utils.fromWei(insurerBalanceWei, 'ether');
        console.log(`Insurer [accounts[0]] Wallet Balance: ${insurerBalanceEth} ETH`);

        // 📦 View passenger policy
        try {
            const policy = await contract.methods.view_purchased_policy().call({from: accounts[1]});
            console.log("Policy Details:");
            console.log(`  Passenger: ${policy[0]}`);
            console.log(`  Flight: ${policy[1]}`);
            console.log(`  Date: ${new Date(policy[2] * 1000).toLocaleString()}`);
            console.log(`  Route: ${policy[3]} to ${policy[4]}`);
            console.log(`  Status: ${policy[5]}`);
        } catch (err) {
            console.log("No policy found for accounts[1]");
        }
        
    } catch (err) {
        console.error(" Error:", err);
    }
})();