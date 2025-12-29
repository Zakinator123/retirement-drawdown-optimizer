// IRS Uniform Lifetime Table for RMD calculations (age -> distribution period)
const RMD_TABLE = {
    72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
    80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
    88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9
};

// All possible withdrawal orders for optimization
const ALL_WITHDRAWAL_ORDERS = [
    { value: 'cash,taxable,ira,roth', name: 'Cash → Taxable → IRA → Roth' },
    { value: 'cash,ira,taxable,roth', name: 'Cash → IRA → Taxable → Roth' },
    { value: 'cash,taxable,roth,ira', name: 'Cash → Taxable → Roth → IRA' },
    { value: 'cash,ira,roth,taxable', name: 'Cash → IRA → Roth → Taxable' },
    { value: 'cash,roth,taxable,ira', name: 'Cash → Roth → Taxable → IRA' },
    { value: 'cash,roth,ira,taxable', name: 'Cash → Roth → IRA → Taxable' },
    { value: 'ira,cash,taxable,roth', name: 'IRA → Cash → Taxable → Roth' },
    { value: 'ira,taxable,cash,roth', name: 'IRA → Taxable → Cash → Roth' },
    { value: 'ira,cash,roth,taxable', name: 'IRA → Cash → Roth → Taxable' },
    { value: 'taxable,cash,ira,roth', name: 'Taxable → Cash → IRA → Roth' },
    { value: 'taxable,ira,cash,roth', name: 'Taxable → IRA → Cash → Roth' },
    { value: 'roth,cash,taxable,ira', name: 'Roth → Cash → Taxable → IRA' },
];

// Calculate RMD for a given age and IRA balance
function calculateRMD(age, iraBalance) {
    if (age < 73 || iraBalance <= 0) return 0;
    const divisor = RMD_TABLE[age] || (age > 95 ? 8.9 : 0);
    return divisor > 0 ? iraBalance / divisor : 0;
}

// Run simulation with 4 accounts: IRA, Roth, Taxable, Cash
function runSimulation(params) {
    const stGainPct = Math.min(1, Math.max(0, params.taxableShortTermPct || 0));
    const nonSaleTaxBase = params.taxableNonSaleTax || 0;
    const iraTaxLossPct = Math.min(1, Math.max(0, params.iraTaxLossPct || 0));
    
    const years = params.endAge - params.startAge;
    const results = {
        ages: [],
        iraBalances: [],
        rothBalances: [],
        taxableBalances: [],
        cashBalances: [],
        withdrawals: { ira: [], roth: [], taxable: [], cash: [] },
        // Track where spending came from (net amounts after embedded taxes)
        spendingFrom: { cash: [], taxable: [], ira: [], roth: [] },
        // Track where tax payments came from (gross withdrawal amounts) - for ALL taxes
        taxPaidFrom: { cash: [], taxable: [], ira: [] },
        // Track investment growth per year
        growth: { ira: [], roth: [], taxable: [], cash: [] },
        // Track RMD surplus that is reinvested to taxable
        rmdSurplus: [],
        incomeTaxes: [],
        capGainsTaxes: [],
        rmds: [],
        conversions: [],
        spending: [],
        // Track spending shortfalls
        shortfalls: []
    };
    
    let ira = params.iraBalance;
    let roth = params.rothBalance;
    let taxable = params.taxableBalance;
    let taxableBasis = params.taxableBalance * params.costBasisPct;
    let cash = params.cashBalance;
    let totalTaxes = 0;
    let totalWithdrawn = 0;
    let totalConverted = 0;
    
    for (let year = 0; year <= years; year++) {
        const age = params.startAge + year;
        const adjustedSpending = params.spending * Math.pow(1 + params.inflation, year);
        
        results.ages.push(age);
        
        if (year === 0) {
            results.iraBalances.push(ira);
            results.rothBalances.push(roth);
            results.taxableBalances.push(taxable);
            results.cashBalances.push(cash);
            results.withdrawals.ira.push(0);
            results.withdrawals.roth.push(0);
            results.withdrawals.taxable.push(0);
            results.withdrawals.cash.push(0);
            results.spendingFrom.cash.push(0);
            results.spendingFrom.taxable.push(0);
            results.spendingFrom.ira.push(0);
            results.spendingFrom.roth.push(0);
            results.taxPaidFrom.cash.push(0);
            results.taxPaidFrom.taxable.push(0);
            results.taxPaidFrom.ira.push(0);
            results.growth.ira.push(0);
            results.growth.roth.push(0);
            results.growth.taxable.push(0);
            results.growth.cash.push(0);
            results.incomeTaxes.push(0);
            results.capGainsTaxes.push(0);
            results.rmds.push(0);
            results.conversions.push(0);
            results.spending.push(0);
            results.rmdSurplus.push(0);
            results.shortfalls.push(0);
            continue;
        }
        
        // Track starting balances for growth calculation
        const iraStart = ira;
        const rothStart = roth;
        const taxableStart = taxable;
        const cashStart = cash;
        
        // Step 1: Apply investment returns at start of year
        ira *= (1 + params.investmentReturn);
        roth *= (1 + params.investmentReturn);
        taxable *= (1 + params.investmentReturn);
        cash *= (1 + params.cashReturn);
        
        // Track growth
        const iraGrowth = ira - iraStart;
        const rothGrowth = roth - rothStart;
        const taxableGrowth = taxable - taxableStart;
        const cashGrowth = cash - cashStart;
        
        let yearlyIncomeTax = 0;
        let yearlyCapGainsTax = 0;
        let iraWithdrawal = 0;
        let rothWithdrawal = 0;
        let taxableWithdrawal = 0;
        let cashWithdrawal = 0;
        
        // Track spending sources (net amounts after embedded taxes)
        let spendingFromCash = 0;
        let spendingFromTaxable = 0;
        let spendingFromIra = 0;
        let spendingFromRoth = 0;
        
        // Track tax payment sources (gross withdrawal amounts for ALL taxes)
        let taxPaidFromCash = 0;
        let taxPaidFromTaxable = 0;
        let taxPaidFromIra = 0;
        
        // Helper: pay a tax bill using cash first, then taxable (with ST/LT split gross-up)
        const payTax = (taxAmount) => {
            let remainingTax = taxAmount;
            
            if (remainingTax > 0 && cash > 0) {
                const fromCash = Math.min(cash, remainingTax);
                cash -= fromCash;
                cashWithdrawal += fromCash;
                taxPaidFromCash += fromCash;
                remainingTax -= fromCash;
            }
            
            let safety = 0;
            while (remainingTax > 1e-6 && taxable > 0 && safety < 4) {
                safety++;
                const gainPct = taxable > 0 ? Math.max(0, (taxable - taxableBasis) / taxable) : 0;
                const effectiveRate = gainPct * (stGainPct * params.taxRate + (1 - stGainPct) * params.capGainsRate);
                const grossNeeded = remainingTax / (1 - effectiveRate);
                const fromTaxable = Math.min(taxable, grossNeeded);
                
                const withdrawalGain = fromTaxable * gainPct;
                const stTax = withdrawalGain * stGainPct * params.taxRate;
                const ltTax = withdrawalGain * (1 - stGainPct) * params.capGainsRate;
                
                taxable -= fromTaxable;
                const basisWithdrawn = fromTaxable * (1 - gainPct);
                taxableBasis = Math.max(0, taxableBasis - basisWithdrawn);
                
                taxableWithdrawal += fromTaxable;
                taxPaidFromTaxable += fromTaxable;
                yearlyIncomeTax += stTax;
                yearlyCapGainsTax += ltTax;
                
                const netAfterTax = fromTaxable - (stTax + ltTax);
                remainingTax -= netAfterTax;
                
                if (taxable <= 0) break;
            }
            
            return remainingTax;
        };
        
        // Step 1b: Tax cash interest (ordinary income)
        const cashInterest = Math.max(0, cashGrowth);
        if (cashInterest > 0 && params.taxRate > 0) {
            const interestTax = cashInterest * params.taxRate;
            yearlyIncomeTax += interestTax;
            payTax(interestTax);
        }
        
        // Step 1c: Apply annual non-sale taxable account tax drag (inflated)
        const inflatedNonSaleTax = nonSaleTaxBase * Math.pow(1 + params.inflation, year);
        if (inflatedNonSaleTax > 0) {
            yearlyCapGainsTax += inflatedNonSaleTax;
            payTax(inflatedNonSaleTax);
        }
        
        // Step 2: Calculate and take RMD if applicable (age 73+)
        const rmdAmount = calculateRMD(age, ira);
        let rmdTaken = 0;
        if (rmdAmount > 0) {
            rmdTaken = Math.min(ira, rmdAmount);
            ira -= rmdTaken;
            iraWithdrawal += rmdTaken;
            yearlyIncomeTax += rmdTaken * params.taxRate;
        }
        
        // Step 3: Withdraw for spending using configurable order
        let rmdNetCash = rmdTaken * (1 - params.taxRate);
        const rmdUsedForSpending = Math.min(rmdNetCash, adjustedSpending);
        spendingFromIra += rmdUsedForSpending; // RMD spending counts as IRA spending
        let remainingSpending = Math.max(0, adjustedSpending - rmdNetCash);
        
        for (const account of params.withdrawalOrder) {
            if (remainingSpending <= 0) break;
            
            if (account === 'cash' && cash > 0) {
                const fromCash = Math.min(cash, remainingSpending);
                cash -= fromCash;
                cashWithdrawal += fromCash;
                spendingFromCash += fromCash;
                remainingSpending -= fromCash;
            }
            else if (account === 'taxable' && taxable > 0) {
                const gainPct = taxable > 0 ? Math.max(0, (taxable - taxableBasis) / taxable) : 0;
                const effectiveRate = gainPct * (stGainPct * params.taxRate + (1 - stGainPct) * params.capGainsRate);
                const grossNeeded = remainingSpending / (1 - effectiveRate);
                const fromTaxable = Math.min(taxable, grossNeeded);
                
                const withdrawalGain = fromTaxable * gainPct;
                const stTax = withdrawalGain * stGainPct * params.taxRate;
                const ltTax = withdrawalGain * (1 - stGainPct) * params.capGainsRate;
                
                taxable -= fromTaxable;
                const basisWithdrawn = fromTaxable * (1 - gainPct);
                taxableBasis = Math.max(0, taxableBasis - basisWithdrawn);
                
                taxableWithdrawal += fromTaxable;
                yearlyIncomeTax += stTax;
                yearlyCapGainsTax += ltTax;
                const netToSpending = fromTaxable - (stTax + ltTax);
                spendingFromTaxable += netToSpending;
                remainingSpending -= netToSpending;
            }
            else if (account === 'ira' && ira > 0) {
                const grossNeeded = remainingSpending / (1 - params.taxRate);
                const fromIra = Math.min(ira, grossNeeded);
                ira -= fromIra;
                iraWithdrawal += fromIra;
                const iraTax = fromIra * params.taxRate;
                yearlyIncomeTax += iraTax;
                const netToSpending = fromIra * (1 - params.taxRate);
                spendingFromIra += netToSpending;
                remainingSpending -= netToSpending;
            }
            else if (account === 'roth' && roth > 0) {
                const fromRoth = Math.min(roth, remainingSpending);
                roth -= fromRoth;
                rothWithdrawal += fromRoth;
                spendingFromRoth += fromRoth;
                remainingSpending -= fromRoth;
            }
        }
        
        // Step 4: Roth conversion at year end
        let yearlyConversion = 0;
        if (age >= params.conversionStartAge && age <= params.conversionEndAge && params.conversion > 0) {
            const conversionAmount = Math.min(ira, params.conversion);
            if (conversionAmount > 0) {
                const conversionTax = conversionAmount * params.taxRate;
                let remainingTax = conversionTax;
                
                // Pay conversion tax from taxable (with gross-up for cap gains)
                if (taxable > 0 && remainingTax > 0) {
                    const gainPct = taxable > 0 ? Math.max(0, (taxable - taxableBasis) / taxable) : 0;
                    const effectiveCapGainsRate = gainPct * (stGainPct * params.taxRate + (1 - stGainPct) * params.capGainsRate);
                    // Gross up: need to withdraw extra to cover cap gains on the withdrawal
                    const grossNeeded = remainingTax / (1 - effectiveCapGainsRate);
                    const fromTaxable = Math.min(taxable, grossNeeded);
                    
                    const withdrawalGain = fromTaxable * gainPct;
                    const stTax = withdrawalGain * stGainPct * params.taxRate;
                    const ltTax = withdrawalGain * (1 - stGainPct) * params.capGainsRate;
                    const capGainsOnTaxPay = stTax + ltTax;
                    const netAfterCapGains = fromTaxable - capGainsOnTaxPay;
                    
                    yearlyIncomeTax += stTax;
                    yearlyCapGainsTax += ltTax;
                    taxable -= fromTaxable;
                    taxableBasis = Math.max(0, taxableBasis - fromTaxable * (1 - gainPct));
                    taxableWithdrawal += fromTaxable;
                    taxPaidFromTaxable += fromTaxable;
                    remainingTax -= netAfterCapGains;
                }
                
                // Pay remaining tax from cash
                if (cash > 0 && remainingTax > 0) {
                    const fromCash = Math.min(cash, remainingTax);
                    cash -= fromCash;
                    cashWithdrawal += fromCash;
                    taxPaidFromCash += fromCash;
                    remainingTax -= fromCash;
                }
                
                // Pay remaining tax from IRA (with gross-up for income tax)
                if (remainingTax > 0 && ira > 0) {
                    const iraForTax = remainingTax / (1 - params.taxRate);
                    const actualFromIra = Math.min(ira, iraForTax);
                    ira -= actualFromIra;
                    iraWithdrawal += actualFromIra;
                    taxPaidFromIra += actualFromIra;
                    yearlyIncomeTax += actualFromIra * params.taxRate;
                    remainingTax -= actualFromIra * (1 - params.taxRate);
                }
                
                yearlyIncomeTax += conversionTax;
                ira -= conversionAmount;
                roth += conversionAmount;
                yearlyConversion = conversionAmount;
                totalConverted += conversionAmount;
            }
        }
        
        totalTaxes += yearlyIncomeTax + yearlyCapGainsTax;
        totalWithdrawn += iraWithdrawal + rothWithdrawal + taxableWithdrawal + cashWithdrawal;
        
        ira = Math.max(0, ira);
        roth = Math.max(0, roth);
        taxable = Math.max(0, taxable);
        taxableBasis = Math.max(0, Math.min(taxableBasis, taxable));
        cash = Math.max(0, cash);
        
        // Reinvest excess RMD net cash (after taxes) into taxable
        if (rmdNetCash > adjustedSpending) {
            const excess = rmdNetCash - adjustedSpending;
            taxable += excess;
            taxableBasis += excess;
            results.rmdSurplus.push(excess);
        } else {
            results.rmdSurplus.push(0);
        }
        
        results.iraBalances.push(ira);
        results.rothBalances.push(roth);
        results.taxableBalances.push(taxable);
        results.cashBalances.push(cash);
        results.withdrawals.ira.push(iraWithdrawal);
        results.withdrawals.roth.push(rothWithdrawal);
        results.withdrawals.taxable.push(taxableWithdrawal);
        results.withdrawals.cash.push(cashWithdrawal);
        results.spendingFrom.cash.push(spendingFromCash);
        results.spendingFrom.taxable.push(spendingFromTaxable);
        results.spendingFrom.ira.push(spendingFromIra);
        results.spendingFrom.roth.push(spendingFromRoth);
        results.taxPaidFrom.cash.push(taxPaidFromCash);
        results.taxPaidFrom.taxable.push(taxPaidFromTaxable);
        results.taxPaidFrom.ira.push(taxPaidFromIra);
        results.growth.ira.push(iraGrowth);
        results.growth.roth.push(rothGrowth);
        results.growth.taxable.push(taxableGrowth);
        results.growth.cash.push(cashGrowth);
        results.incomeTaxes.push(yearlyIncomeTax);
        results.capGainsTaxes.push(yearlyCapGainsTax);
        results.rmds.push(rmdTaken);
        results.conversions.push(yearlyConversion);
        results.spending.push(adjustedSpending);
        results.shortfalls.push(Math.max(0, remainingSpending));
    }
    
    results.totalTaxes = totalTaxes;
    results.totalWithdrawn = totalWithdrawn;
    results.totalConverted = totalConverted;
    results.finalTotal = ira + roth + taxable + cash;
    results.finalEquivCash = roth + cash + taxable + ira * (1 - iraTaxLossPct);
    
    return results;
}

// Find optimal conversion amount
function findOptimalConversion(baseParams) {
    let bestConversion = 0;
    let bestTotal = 0;
    
    for (let conv = 0; conv <= 300000; conv += 5000) {
        const params = { ...baseParams, conversion: conv };
        const results = runSimulation(params);
        if (results.finalTotal > bestTotal) {
            bestTotal = results.finalTotal;
            bestConversion = conv;
        }
    }
    
    const lowerBound = Math.max(0, bestConversion - 5000);
    const upperBound = bestConversion + 5000;
    for (let conv = lowerBound; conv <= upperBound; conv += 1000) {
        const params = { ...baseParams, conversion: conv };
        const results = runSimulation(params);
        if (results.finalTotal > bestTotal) {
            bestTotal = results.finalTotal;
            bestConversion = conv;
        }
    }
    
    return { conversion: bestConversion, total: bestTotal };
}

// Find optimal withdrawal order
function findOptimalWithdrawalOrder(baseParams) {
    let bestOrder = null;
    let bestTotal = 0;
    let allResults = [];
    
    for (const order of ALL_WITHDRAWAL_ORDERS) {
        const params = { ...baseParams, withdrawalOrder: order.value.split(',') };
        const results = runSimulation(params);
        allResults.push({ order: order, total: results.finalTotal });
        if (results.finalTotal > bestTotal) {
            bestTotal = results.finalTotal;
            bestOrder = order;
        }
    }
    
    allResults.sort((a, b) => b.total - a.total);
    
    return { order: bestOrder, total: bestTotal, allResults: allResults };
}

// Export for testing (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateRMD, runSimulation, findOptimalConversion, findOptimalWithdrawalOrder, RMD_TABLE, ALL_WITHDRAWAL_ORDERS };
}
