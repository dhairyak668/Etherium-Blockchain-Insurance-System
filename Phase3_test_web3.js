// Phase 3: Auto-verify using live OpenWeatherMap API
(async () => {
    const addressPath = 'Insurance/contract_address.txt';
    const contractAddress = (await remix.call('fileManager', 'getFile', addressPath)).trim();
    const artifactsPath = `browser/Insurance/artifacts/FlightInsurance.json`;
    const line = '-'.repeat(120);
    const apiKey = ""; // Replace with your OpenWeatherMap API key

    try {
        console.log("PHASE 3: Auto Weather Verification via OpenWeatherMap");
        console.log(line);

        const metadata = JSON.parse(await remix.call('fileManager', 'getFile', artifactsPath));
        const accounts = await web3.eth.getAccounts();
        const contract = new web3.eth.Contract(metadata.abi, contractAddress);

        // Purchase a new test policy for Ames 
        console.log("Purchasing test policy for Ames (Passenger 1)");
        try {
            await contract.methods.purchase_policy(
                "Jamie Fallon",
                "IA001",
                1746144000, 
                "Ames",
                "Chicago"
            ).send({
                from: accounts[4],
                value: web3.utils.toWei("0.01", "ether")
            });
            console.log("Policy purchase successful for Ames");
        } catch (err) {
            console.log("Policy already exists or error occurred:", err.message);
        }

        const policies = await contract.methods.view_all_policies().call({ from: accounts[0] });
        console.log(`Found ${policies.length} policies`);
        console.log(line);
        console.log("Policy Details:");
        for (const policy of policies) {
            console.log("====================================");
            console.log(`  Passenger: ${policy.passengerName}`);
            console.log(`  Flight: ${policy.flightNumber}`);
            console.log(`  Date: ${new Date(policy.flightDate * 1000).toLocaleString()}`);
            console.log(`  Route: ${policy.departureCity} to ${policy.destinationCity}`);
            console.log(`  Status: ${policy.status}`);
            console.log("====================================");
        }
        console.log(line);

        for (const policy of policies) {
            const passengerName = policy.passengerName;
            const passengerAddress = policy.passengerAddress;
            const city = policy.departureCity;

            if (policy.status !== "purchased") {
                console.log(`Skipping ${passengerName}, status: ${policy.status}`);
                console.log(line);
                continue;
            }

            console.log(`Checking live weather for ${passengerName} in ${city}...`);
            const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;

            try {
                const response = await fetch(apiUrl);
                const data = await response.json();

                if (!data.weather || !data.weather.length) {
                    console.log(`No weather data for ${city}`);
                    console.log(line);
                    continue;
                }

                const condition = data.weather[0].main.toLowerCase();
                console.log(`Current weather in ${city}: ${condition}`);

                const qualifying = ["hail", "flood", "rain","clouds", "snow", "thunderstorm"];
                if (qualifying.includes(condition)) {
                    console.log(`Weather qualifies (${condition}), verifying and paying indemnity...`);

                    await contract.methods.verify(passengerAddress, condition).send({ from: accounts[0] });
                    console.log(`Verified weather condition for ${passengerName}`);

                    const contractBalBefore = await web3.eth.getBalance(contractAddress);
                    const passengerBalBefore = await web3.eth.getBalance(passengerAddress);

                    await contract.methods.pay_indemnity(passengerAddress).send({ from: accounts[0] });
                    console.log(`Indemnity paid to ${passengerName}`);

                    const contractBalAfter = await web3.eth.getBalance(contractAddress);
                    const passengerBalAfter = await web3.eth.getBalance(passengerAddress);

                    console.log(`Contract Balance Before: ${web3.utils.fromWei(contractBalBefore, 'ether')} ETH`);
                    console.log(`Contract Balance After:  ${web3.utils.fromWei(contractBalAfter, 'ether')} ETH`);
                    console.log(`Passenger Balance Before: ${web3.utils.fromWei(passengerBalBefore, 'ether')} ETH`);
                    console.log(`Passenger Balance After:  ${web3.utils.fromWei(passengerBalAfter, 'ether')} ETH`);

                } else {
                    console.log(`Weather does not qualify for indemnity: ${condition}`);
                }

            } catch (err) {
                console.log(`API error for ${city}: ${err.message}`);
            }

            console.log(line);
        }

        console.log("Phase 3 verification completed.");
        console.log(line);

    } catch (err) {
        console.error("Error during Phase 3 execution:", err.message);
    }
})();