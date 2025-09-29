// Phase 2: Full test suite for weather verification and indemnity payout
(async () => {
    const addressPath = 'Insurance/contract_address.txt';
    const contractAddress = (await remix.call('fileManager', 'getFile', addressPath)).trim();
    const artifactsPath = `browser/Insurance/artifacts/FlightInsurance.json`;
    const weatherDataPath = `Insurance/weather.txt`;
    const line = '-'.repeat(120);

    try {
        console.log("PHASE 2: Weather Verification and Indemnity Test Suite");
        console.log(line);

        const metadata = JSON.parse(await remix.call('fileManager', 'getFile', artifactsPath));
        const accounts = await web3.eth.getAccounts();
        const contract = new web3.eth.Contract(metadata.abi, contractAddress);

        console.log("TEST 1: Read and Parse Weather Events");
        const weatherData = await remix.call('fileManager', 'getFile', weatherDataPath);
        const weatherEvents = weatherData.split('\n')
            .slice(1)
            .filter(line => line.trim() !== '')
            .map(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length < 3) return null;
                const dateStr = parts[0];
                const dateObj = new Date(dateStr);
                const timestamp = Math.floor(dateObj.getTime() / 1000);
                return {
                    timestamp,
                    city: parts[1].toLowerCase(),
                    condition: parts[2].toLowerCase()
                };
            }).filter(e => e !== null);

        console.log(`Parsed ${weatherEvents.length} weather events`);
        console.log("Weather Events:");
        for (const event of weatherEvents) {
        console.log(`${event.city} | ${event.condition} | ${event.timestamp} | ${new Date(event.timestamp * 1000).toUTCString()}`);
        }
        console.log(line);
        

        console.log("TEST 2: Process Each Policy Based on Weather");
        const policies = await contract.methods.view_all_policies().call({ from: accounts[0] });
        console.log(`Found ${policies.length} policies`);
        console.log(line);

        for (const policy of policies) {
            const passengerName = policy.passengerName;
            const passengerAddress = policy.passengerAddress;
            const city = policy.departureCity.toLowerCase();
            const date = parseInt(policy.flightDate);
            const flight = policy.flightNumber;

            console.log(`Verifying policy for ${passengerName}, Flight: ${flight}, Departure: ${city}`);

            if (policy.status !== "purchased") {
                console.log(`Policy already ${policy.status}, skipping`);
                console.log(line);
                continue;
            }

            const isSameDay = (ts1, ts2) => {
                const d1 = new Date(ts1 * 1000);
                const d2 = new Date(ts2 * 1000);
                return d1.getUTCFullYear() === d2.getUTCFullYear()
                    && d1.getUTCMonth() === d2.getUTCMonth()
                    && d1.getUTCDate() === d2.getUTCDate();
            };
            
            const match = weatherEvents.find(e =>
                e.city === city && isSameDay(e.timestamp, date)
            );

            if (!match) {
                console.log(`No weather data found for ${city} on ${new Date(date * 1000).toLocaleDateString()}`);
                console.log(line);
                continue;
            }

            console.log(`Found weather data for ${city}: ${match.condition}`);

            if (match.condition === "hail" || match.condition === "flood") {
                console.log(`Extreme weather detected (${match.condition}), verifying...`);
                try {
                    await contract.methods.verify(passengerAddress, match.condition).send({ from: accounts[0] });
                    console.log(`Weather verification recorded for ${passengerName}`);

                    console.log(`Processing payout for ${passengerName}...`);
                    const contractBalanceBefore = await web3.eth.getBalance(contractAddress);
                    const passengerBalanceBefore = await web3.eth.getBalance(passengerAddress);

                    await contract.methods.pay_indemnity(passengerAddress).send({ from: accounts[0] });
                    console.log(`Payout successful for ${passengerName}`);

                    const contractBalanceAfter = await web3.eth.getBalance(contractAddress);
                    const passengerBalanceAfter = await web3.eth.getBalance(passengerAddress);

                    console.log(`Contract Balance Before: ${web3.utils.fromWei(contractBalanceBefore, 'ether')} ETH`);
                    console.log(`Contract Balance After:  ${web3.utils.fromWei(contractBalanceAfter, 'ether')} ETH`);
                    console.log(`Passenger Balance Before: ${web3.utils.fromWei(passengerBalanceBefore, 'ether')} ETH`);
                    console.log(`Passenger Balance After:  ${web3.utils.fromWei(passengerBalanceAfter, 'ether')} ETH`);
                } catch (err) {
                    console.log(`Error during verification or payout for ${passengerName}: ${err.message}`);
                }
            } else {
                console.log(`Weather condition (${match.condition}) does not qualify for indemnity`);
                try {
                    await contract.methods.verify(passengerAddress, match.condition).send({ from: accounts[0] });
                    console.log(`Verified non-extreme condition (${match.condition}) for ${passengerName}`);
                } catch (err) {
                    console.log(`Expected rejection or non-payment for ${passengerName}: ${err.message}`);
                }
            }

            console.log(line);
        }

        console.log("Phase 2 test suite completed.");
        console.log(line);

    } catch (err) {
        console.error("Error running phase 2 tests:", err.message);
    }
})();