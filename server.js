import express from 'express';
import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

(async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'public')));

    const web3 = new Web3(process.env.INFURA_URL);

    const FlightInsuranceArtifact = JSON.parse(fs.readFileSync('./contract/FlightInsurance.json'));
    const abi = FlightInsuranceArtifact.abi;
    console.log("ABI loaded. Methods available in ABI:");
    abi.forEach(entry => {
        if (entry.type === "function") {
            console.log(` - ${entry.name}`);
        }
    });
    const contractAddress = process.env.CONTRACT_ADDRESS;
    const contract = new web3.eth.Contract(abi, contractAddress);
    console.log(`Contract initialized at: ${contractAddress}`);
    const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);

    // Route: Buy Policy
    app.post('/buy', async (req, res) => {
        const { name, flight, date, fromCity, toCity } = req.body;
        console.log("Incoming /buy request:", { name, flight, date, fromCity, toCity });
        try {
            const timestamp = Math.floor(new Date(date).getTime() / 1000);  // Convert to Unix time

            const tx = contract.methods.purchase_policy(name, flight, timestamp, fromCity, toCity);
            const receipt = await tx.send({
                from: account.address,
                value: web3.utils.toWei("0.01", "ether"),
                gas: 300000
            });
            res.send({ status: "Purchased", receipt });
        } catch (err) {
            console.error("Error in /buy route:", err);
            res.status(500).send({ error: err.message });
        }
    });

    // Route: Verify and Claim
    app.post('/claim', async (req, res) => {
        const { city, passenger } = req.body;
        console.log("Incoming /claim request:", { city, passenger });
        const apiKey = '77695591f9f76a49f327ab084420c1fb';
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`);
            const data = await response.json();
            const condition = data.weather[0].main.toLowerCase();
            const valid = ['hail', 'flood', 'rain', 'snow', 'thunderstorm'].includes(condition);

            if (valid) {
                await contract.methods.verify(passenger, condition).send({ from: account.address, gas: 200000 });
                await contract.methods.pay_indemnity(passenger).send({ from: account.address, gas: 200000 });
                res.send({ status: "Claim processed", condition });
            } else {
                res.send({ status: "Weather not extreme", condition });
            }
        } catch (err) {
            console.error("Error in /claim route:", err);
            res.status(500).send({ error: err.message });
        }
    });

    // Route: View Available Policy Info
    app.get('/available', async (req, res) => {
        try {
            const result = await contract.methods.view_available_policy().call();
            console.log("Available policy fetched from contract:", result);

            res.send({ policy: result });
        } catch (err) {
            console.error("Error in /available route:", err);
            res.status(500).send({ error: err.message });
        }
    });

    // Start Server
    app.listen(3000, () => {
        console.log("🚀 Running at http://localhost:3000");
    });
})();