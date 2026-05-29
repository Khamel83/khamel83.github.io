document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('calc-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.getElementById('btn-loader');
    const resultsContainer = document.getElementById('results-container');
    const resultsBody = document.getElementById('results-body');

    // Box-Muller transform for normal distribution
    function randomNormal(mean, stdDev) {
        let u1 = Math.random();
        let u2 = Math.random();
        let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    }

    function simulatePath(currentAge, retireAge, portfolio, annualSavings, targetSpend, muReal, sigmaReal) {
        let engine = portfolio;
        
        // Working Phase
        for (let age = currentAge; age < retireAge; age++) {
            let r = randomNormal(muReal, sigmaReal);
            engine = engine * (1 + r) + annualSavings;
        }
        
        // Retirement Phase
        for (let age = retireAge; age < 95; age++) {
            let r = randomNormal(muReal, sigmaReal);
            // Rough 15% effective tax rate assumption
            let grossWithdrawal = targetSpend / 0.85; 
            
            engine = engine * (1 + r) - grossWithdrawal;
            
            if (engine < 0) {
                return false;
            }
        }
        return true;
    }

    async function runMonteCarlo(currentAge, portfolio, annualSavings, targetSpend) {
        const trials = 5000;
        const sigmaReal = 0.15;
        const returnsToTest = [
            { rate: 0.04, label: "4.0% (Conservative)" },
            { rate: 0.05, label: "5.0% (Historical)" },
            { rate: 0.06, label: "6.0% (Strong)" }
        ];

        let results = [];

        // We use setTimeout to yield to the main thread so the UI doesn't freeze
        for (let { rate, label } of returnsToTest) {
            let found = false;
            for (let testAge = currentAge; testAge <= 75; testAge++) {
                
                // Yield to UI thread every age loop
                await new Promise(resolve => setTimeout(resolve, 0));

                let successes = 0;
                for (let i = 0; i < trials; i++) {
                    if (simulatePath(currentAge, testAge, portfolio, annualSavings, targetSpend, rate, sigmaReal)) {
                        successes++;
                    }
                }

                if ((successes / trials) >= 0.80) {
                    results.push({ label, age: testAge });
                    found = true;
                    break;
                }
            }
            if (!found) {
                results.push({ label, age: "75+ (Fails)" });
            }
        }

        return results;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get values
        const currentAge = parseInt(document.getElementById('currentAge').value);
        const portfolio = parseFloat(document.getElementById('portfolio').value);
        const annualSavings = parseFloat(document.getElementById('annualSavings').value);
        const targetSpend = parseFloat(document.getElementById('targetSpend').value);

        // UI State: Loading
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        submitBtn.disabled = true;
        resultsContainer.classList.add('hidden');
        resultsBody.innerHTML = '';

        // Run simulation
        const results = await runMonteCarlo(currentAge, portfolio, annualSavings, targetSpend);

        // Render results
        results.forEach(res => {
            const tr = document.createElement('tr');
            
            const tdLabel = document.createElement('td');
            tdLabel.textContent = res.label;
            
            const tdAge = document.createElement('td');
            tdAge.textContent = res.age !== "75+ (Fails)" ? `Age ${res.age}` : res.age;
            if(res.age !== "75+ (Fails)") {
                tdAge.style.color = 'white';
            } else {
                tdAge.style.color = '#ef4444'; // red-500
            }

            tr.appendChild(tdLabel);
            tr.appendChild(tdAge);
            resultsBody.appendChild(tr);
        });

        // UI State: Done
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
        resultsContainer.classList.remove('hidden');
    });
});
