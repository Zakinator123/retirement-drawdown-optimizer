    // Format currency (compact)
function formatCurrency(value) {
    if (Math.abs(value) >= 1000000) {
        return '$' + (value / 1000000).toFixed(2) + 'M';
    } else if (Math.abs(value) >= 1000) {
        return '$' + (value / 1000).toFixed(0) + 'k';
    }
    return '$' + value.toFixed(0);
}

// Format currency (full)
function formatCurrencyFull(value) {
    return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Get current parameters from sliders
function getParams() {
    return {
        iraBalance: parseFloat(document.getElementById('iraBalance').value),
        rothBalance: parseFloat(document.getElementById('rothBalance').value),
        taxableBalance: parseFloat(document.getElementById('taxableBalance').value),
        cashBalance: parseFloat(document.getElementById('cashBalance').value),
        taxRate: parseFloat(document.getElementById('taxRate').value) / 100,
        capGainsRate: parseFloat(document.getElementById('capGainsRate').value) / 100,
        costBasisPct: parseFloat(document.getElementById('costBasis').value) / 100,
        taxableShortTermPct: parseFloat(document.getElementById('taxableShortTermPct').value) / 100,
        taxableNonSaleTax: parseFloat(document.getElementById('taxableNonSaleTax').value),
        investmentReturn: parseFloat(document.getElementById('investmentReturn').value) / 100,
        cashReturn: parseFloat(document.getElementById('cashReturn').value) / 100,
        spending: parseFloat(document.getElementById('spending').value),
        inflation: parseFloat(document.getElementById('inflation').value) / 100,
        conversion: parseFloat(document.getElementById('conversion').value),
        iraTaxLossPct: parseFloat(document.getElementById('iraTaxLossPct').value) / 100,
        startAge: 62,
        endAge: parseFloat(document.getElementById('endAge').value),
        conversionStartAge: parseFloat(document.getElementById('convStartAge').value),
        conversionEndAge: parseFloat(document.getElementById('convEndAge').value),
        rmdStartAge: 73,
        withdrawalOrder: document.getElementById('withdrawalOrder').value.split(',')
    };
}

// Update display
function updateDisplay() {
    const params = getParams();
    const results = runSimulation(params);
    
    // Update end age labels
    document.querySelectorAll('.end-age-label').forEach(el => {
        el.textContent = params.endAge;
    });
    
    // Calculate totals
    const totalIncomeTax = results.incomeTaxes.reduce((a, b) => a + b, 0);
    const totalCapGainsTax = results.capGainsTaxes.reduce((a, b) => a + b, 0);
    const totalRmds = results.rmds.reduce((a, b) => a + b, 0);
    
    // Update summary cards
    document.getElementById('finalIra').textContent = formatCurrency(results.iraBalances[results.iraBalances.length - 1]);
    document.getElementById('finalRoth').textContent = formatCurrency(results.rothBalances[results.rothBalances.length - 1]);
    document.getElementById('finalTaxable').textContent = formatCurrency(results.taxableBalances[results.taxableBalances.length - 1]);
    document.getElementById('finalCash').textContent = formatCurrency(results.cashBalances[results.cashBalances.length - 1]);
    document.getElementById('finalTotal').textContent = formatCurrency(results.finalTotal);
    if (results.finalEquivCash !== undefined) {
        document.getElementById('finalEquiv').textContent = formatCurrency(results.finalEquivCash);
    }
    document.getElementById('totalIncomeTax').textContent = formatCurrency(totalIncomeTax);
    document.getElementById('totalCapGainsTax').textContent = formatCurrency(totalCapGainsTax);
    document.getElementById('totalConverted').textContent = formatCurrency(results.totalConverted);
    document.getElementById('totalRmds').textContent = formatCurrency(totalRmds);
    
    updateCharts(results);
    updateTable(results);
    updateStickyHeaderOffsets();
}

function updateStickyHeaderOffsets() {
    const table = document.querySelector('.data-table');
    if (!table) return;
    const groupRow = table.querySelector('thead tr.group-header-row');
    if (!groupRow) return;
    const h = Math.ceil(groupRow.getBoundingClientRect().height);
    table.style.setProperty('--stickyHeaderRow1Height', `${h}px`);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e60fa2fd-c46a-4c51-8687-5a1544ed8cbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ui.js:84',message:'Sticky header height measured',data:{h},timestamp:Date.now(),sessionId:'debug-session',runId:'sticky-gap',hypothesisId:'StickyGap'})}).catch(()=>{});
    // #endregion
}

// Format currency or return dash for zero values (with tolerance for rounding errors)
function formatCurrencyOrDash(value) {
    return value > 0.005 ? formatCurrencyFull(value) : '-';
}

// Update data table with grouped columns
function updateTable(results) {
    const tbody = document.getElementById('dataTable');
    tbody.innerHTML = '';
    
    for (let i = 0; i < results.ages.length; i++) {
        const row = document.createElement('tr');
        
        // Calculate total IRA tax (both withheld from spending and used to pay other taxes)
        // Total IRA withdrawal = Net spending from IRA + Tax withheld + IRA used to pay other taxes + Conversions
        const iraTaxWithheld = results.withdrawals.ira[i] - results.spendingFrom.ira[i] - results.taxPaidFrom.ira[i] - results.conversions[i];
        const totalIraTax = iraTaxWithheld + results.taxPaidFrom.ira[i];
        
        // Determine RMD color: green if voluntary withdrawals beyond RMD, red if RMD is forcing withdrawal
        const rmdColor = results.rmds[i] > 0 ? 
            (results.withdrawals.ira[i] > results.rmds[i] ? 'rmd-voluntary' : 'rmd-forced') : '';
        
        row.innerHTML = `
            <td class="age-col">${results.ages[i]}</td>
            <td>${formatCurrencyFull(results.iraBalances[i])}</td>
            <td>${formatCurrencyFull(results.rothBalances[i])}</td>
            <td>${formatCurrencyFull(results.taxableBalances[i])}</td>
            <td>${formatCurrencyFull(results.cashBalances[i])}</td>
            <td class="spending-total">${formatCurrencyFull(results.spending[i])}</td>
            <td>${formatCurrencyOrDash(results.spendingFrom.cash[i])}</td>
            <td>${formatCurrencyOrDash(results.spendingFrom.taxable[i])}</td>
            <td title="Net amount from IRA after taxes (includes RMD if applicable)">${formatCurrencyOrDash(results.spendingFrom.ira[i])}</td>
            <td>${formatCurrencyOrDash(results.spendingFrom.roth[i])}</td>
            <td class="tax-total">${formatCurrencyFull(results.incomeTaxes[i])}</td>
            <td class="tax-total">${formatCurrencyFull(results.capGainsTaxes[i])}</td>
            <td>${formatCurrencyOrDash(results.taxPaidFrom.cash[i])}</td>
            <td>${formatCurrencyOrDash(results.taxPaidFrom.taxable[i])}</td>
            <td title="Total IRA taxes: withheld from withdrawals + used to pay other taxes" class="tax-withheld">${formatCurrencyOrDash(totalIraTax)}</td>
            <td title="Total gross IRA withdrawals (all purposes)" class="ira-gross">${formatCurrencyOrDash(results.withdrawals.ira[i])}</td>
            <td class="rmd-col ${rmdColor}" title="Required Minimum Distribution - Green: voluntary extra withdrawal, Red: RMD forces withdrawal">${formatCurrencyOrDash(results.rmds[i])}</td>
            <td title="RMD surplus after covering spending, reinvested to taxable account">${formatCurrencyOrDash(results.rmdSurplus[i] || 0)}</td>
            <td>${formatCurrencyOrDash(results.conversions[i])}</td>
        `;
        tbody.appendChild(row);
    }
}

// Update slider value displays
function updateSliderValues() {
    document.getElementById('iraBalanceValue').textContent = formatCurrencyFull(parseFloat(document.getElementById('iraBalance').value));
    document.getElementById('rothBalanceValue').textContent = formatCurrencyFull(parseFloat(document.getElementById('rothBalance').value));
    document.getElementById('taxableBalanceValue').textContent = formatCurrencyFull(parseFloat(document.getElementById('taxableBalance').value));
    document.getElementById('cashBalanceValue').textContent = formatCurrencyFull(parseFloat(document.getElementById('cashBalance').value));
    document.getElementById('taxRateValue').textContent = document.getElementById('taxRate').value + '%';
    document.getElementById('capGainsRateValue').textContent = document.getElementById('capGainsRate').value + '%';
    document.getElementById('costBasisValue').textContent = document.getElementById('costBasis').value + '%';
    document.getElementById('taxableShortTermPctValue').textContent = document.getElementById('taxableShortTermPct').value + '%';
    document.getElementById('taxableNonSaleTaxValue').textContent = formatCurrencyFull(parseFloat(document.getElementById('taxableNonSaleTax').value));
    document.getElementById('investmentReturnValue').textContent = document.getElementById('investmentReturn').value + '%';
    document.getElementById('cashReturnValue').textContent = document.getElementById('cashReturn').value + '%';
    document.getElementById('spendingValue').textContent = formatCurrencyFull(parseFloat(document.getElementById('spending').value));
    document.getElementById('inflationValue').textContent = document.getElementById('inflation').value + '%';
    document.getElementById('conversionValue').textContent = formatCurrencyFull(parseFloat(document.getElementById('conversion').value));
    document.getElementById('iraTaxLossPctValue').textContent = document.getElementById('iraTaxLossPct').value + '%';
    document.getElementById('convStartAgeValue').textContent = document.getElementById('convStartAge').value;
    document.getElementById('convEndAgeValue').textContent = document.getElementById('convEndAge').value;
    document.getElementById('endAgeValue').textContent = document.getElementById('endAge').value;
    
    updateAssumptionNotes();
}

// Update assumption notes on the "Find Optimal" buttons
function updateAssumptionNotes() {
    const taxRate = document.getElementById('taxRate').value;
    const returnRate = document.getElementById('investmentReturn').value;
    const capGains = document.getElementById('capGainsRate').value;
    const inflation = document.getElementById('inflation').value;
    const endAge = document.getElementById('endAge').value;
    
    const noteText = `Using: ${taxRate}% tax, ${returnRate}% return, ${capGains}% cap gains, ${inflation}% inflation, age ${endAge}`;
    
    document.getElementById('withdrawalAssumptions').textContent = noteText;
    document.getElementById('conversionAssumptions').textContent = noteText;
}

// Load preset scenario
function loadScenario(scenario) {
    // Reset to default values
    document.getElementById('iraBalance').value = 2000000;
    document.getElementById('rothBalance').value = 0;
    document.getElementById('taxableBalance').value = 500000;
    document.getElementById('cashBalance').value = 200000;
    document.getElementById('taxRate').value = 25;
    document.getElementById('capGainsRate').value = 15;
    document.getElementById('costBasis').value = 50;
    document.getElementById('taxableShortTermPct').value = 0;
    document.getElementById('taxableNonSaleTax').value = 0;
    document.getElementById('investmentReturn').value = 8;
    document.getElementById('cashReturn').value = 3;
    document.getElementById('spending').value = 100000;
    document.getElementById('inflation').value = 3;
    document.getElementById('conversion').value = 50000;
    document.getElementById('iraTaxLossPct').value = 0;
    document.getElementById('convStartAge').value = 63;
    document.getElementById('convEndAge').value = 68;
    document.getElementById('endAge').value = 85;
    document.getElementById('withdrawalOrder').value = 'cash,taxable,ira,roth';
    
    // Clear active states
    document.querySelectorAll('.scenario-btn').forEach(btn => btn.classList.remove('active'));
    
    // Hide optimal results
    document.getElementById('optimalResult').style.display = 'none';
    document.getElementById('optimalOrderResult').style.display = 'none';
    document.getElementById('orderComparisonTable').style.display = 'none';
    
    switch (scenario) {
        case 1:
            document.getElementById('conversion').value = 50000;
            document.getElementById('taxRate').value = 25;
            document.getElementById('scenario1').classList.add('active');
            break;
            
        case 2:
            document.getElementById('conversion').value = 100000;
            document.getElementById('taxRate').value = 25;
            document.getElementById('scenario2').classList.add('active');
            break;
            
        case 3:
            document.getElementById('scenario3').classList.add('active');
            const params = getParams();
            const optimal = findOptimalConversion(params);
            document.getElementById('conversion').value = optimal.conversion;
            document.getElementById('optimalAmount').textContent = formatCurrencyFull(optimal.conversion);
            document.getElementById('optimalTotal').textContent = formatCurrencyFull(optimal.total);
            document.getElementById('optimalResult').style.display = 'flex';
            break;
            
        case 4:
            document.getElementById('conversion').value = 50000;
            document.getElementById('taxRate').value = 20;
            document.getElementById('scenario4').classList.add('active');
            break;
            
        case 5:
            document.getElementById('conversion').value = 50000;
            document.getElementById('investmentReturn').value = 15;
            document.getElementById('scenario5').classList.add('active');
            break;
    }
    
    updateSliderValues();
    updateDisplay();
}

// Find and display optimal withdrawal order
function findOptimalWithdrawalOrderUI() {
    const baseParams = getParams();
    const result = findOptimalWithdrawalOrder(baseParams);
    
    // Update dropdown
    document.getElementById('withdrawalOrder').value = result.order.value;
    
    // Show result
    document.getElementById('optimalOrderName').textContent = result.order.name;
    document.getElementById('optimalOrderTotal').textContent = formatCurrencyFull(result.total);
    document.getElementById('optimalOrderResult').style.display = 'flex';
    
    // Build comparison table
    const listEl = document.getElementById('orderComparisonList');
    listEl.innerHTML = '';
    result.allResults.forEach((r, i) => {
        const diff = result.total - r.total;
        const item = document.createElement('div');
        item.className = 'comparison-item' + (i === 0 ? ' best' : '');
        item.innerHTML = `
            <span class="rank">${i + 1}.</span>
            <span class="name">${r.order.name}</span>
            <span class="value">${formatCurrency(r.total)}</span>
            ${diff > 0 ? `<span class="diff">-${formatCurrency(diff)}</span>` : ''}
        `;
        listEl.appendChild(item);
    });
    document.getElementById('orderComparisonTable').style.display = 'block';
    
    updateDisplay();
}

// Initialize event listeners
function initEventListeners() {
    // Slider listeners
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener('input', () => {
            updateSliderValues();
            updateDisplay();
            document.querySelectorAll('.scenario-btn').forEach(btn => btn.classList.remove('active'));
        });
    });
    
    // Withdrawal order dropdown
    document.getElementById('withdrawalOrder').addEventListener('change', () => {
        updateDisplay();
        document.getElementById('optimalOrderResult').style.display = 'none';
        document.getElementById('orderComparisonTable').style.display = 'none';
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initEventListeners();
    updateSliderValues();
    updateDisplay();
    window.addEventListener('resize', () => updateStickyHeaderOffsets());

    const scroller = document.querySelector('.table-scroll');
    if (scroller) {
        let lastH = null;
        scroller.addEventListener('scroll', () => {
            const table = document.querySelector('.data-table');
            const groupRow = table?.querySelector('thead tr.group-header-row');
            if (!table || !groupRow) return;
            const h = Math.ceil(groupRow.getBoundingClientRect().height);
            if (lastH === null || Math.abs(lastH - h) >= 1) {
                lastH = h;
                table.style.setProperty('--stickyHeaderRow1Height', `${h}px`);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/e60fa2fd-c46a-4c51-8687-5a1544ed8cbc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ui.js:305',message:'Sticky height on scroll',data:{scrollTop:scroller.scrollTop,h},timestamp:Date.now(),sessionId:'debug-session',runId:'sticky-gap',hypothesisId:'StickyGap'})}).catch(()=>{});
                // #endregion
            }
        }, { passive: true });
    }
});
