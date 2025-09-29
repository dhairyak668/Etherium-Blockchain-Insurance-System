(async () => {
    const city = "Ames";
    const apiKey = "";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.weather || !data.weather.length) {
            console.log("No weather data available.");
            return;
        }

        const condition = data.weather[0].main.toLowerCase();
        console.log(`Current weather in ${city}: ${condition}`);

        const qualifyingConditions = ["hail", "flood", "rain","clouds", "snow", "thunderstorm"];
        if (qualifyingConditions.includes(condition)) {
            console.log(` Weather condition (${condition}) qualifies for payout.`);
        } else {
            console.log(` Weather condition (${condition}) does not qualify.`);
        }

    } catch (err) {
        console.error("API call failed:", err.message);
    }
})();