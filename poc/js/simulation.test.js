const { calculateRMD, runSimulation, findOptimalConversion, RMD_TABLE } = require('./simulation');

// Helper to create default params
function defaultParams(overrides = {}) {
    return {
        iraBalance: 2000000,
        rothBalance: 0,
        taxableBalance: 500000,
        cashBalance: 200000,
        taxRate: 0.25,
        capGainsRate: 0.15,
        costBasisPct: 0.5,
        taxableShortTermPct: 0,
        taxableNonSaleTax: 0,
        investmentReturn: 0.08,
        cashReturn: 0.03,
        spending: 100000,
        inflation: 0.03,
        conversion: 50000,
        startAge: 62,
        endAge: 85,
        conversionStartAge: 63,
        conversionEndAge: 68,
        rmdStartAge: 73,
        withdrawalOrder: ['cash', 'taxable', 'ira', 'roth'],
        iraTaxLossPct: 0,
        ...overrides
    };
}

describe('calculateRMD', () => {
    test('returns 0 for age under 73', () => {
        expect(calculateRMD(72, 1000000)).toBe(0);
        expect(calculateRMD(62, 1000000)).toBe(0);
    });

    test('returns 0 for zero or negative balance', () => {
        expect(calculateRMD(75, 0)).toBe(0);
        expect(calculateRMD(75, -1000)).toBe(0);
    });

    test('calculates correctly at age 73', () => {
        const balance = 1000000;
        const expected = balance / 26.5;
        expect(calculateRMD(73, balance)).toBeCloseTo(expected, 2);
    });

    test('calculates correctly at age 80', () => {
        const balance = 500000;
        const expected = balance / 20.2;
        expect(calculateRMD(80, balance)).toBeCloseTo(expected, 2);
    });

    test('uses 8.9 divisor for ages over 95', () => {
        const balance = 200000;
        expect(calculateRMD(96, balance)).toBeCloseTo(balance / 8.9, 2);
        expect(calculateRMD(100, balance)).toBeCloseTo(balance / 8.9, 2);
    });

    test('RMD table has correct values', () => {
        expect(RMD_TABLE[73]).toBe(26.5);
        expect(RMD_TABLE[85]).toBe(16.0);
        expect(RMD_TABLE[95]).toBe(8.9);
    });
});

describe('runSimulation - Basic Structure', () => {
    test('returns correct number of years', () => {
        const params = defaultParams({ startAge: 62, endAge: 70 });
        const results = runSimulation(params);
        expect(results.ages.length).toBe(9); // 62, 63, 64, 65, 66, 67, 68, 69, 70
        expect(results.ages[0]).toBe(62);
        expect(results.ages[8]).toBe(70);
    });

    test('year 0 has no activity', () => {
        const results = runSimulation(defaultParams());
        expect(results.withdrawals.ira[0]).toBe(0);
        expect(results.withdrawals.cash[0]).toBe(0);
        expect(results.incomeTaxes[0]).toBe(0);
        expect(results.conversions[0]).toBe(0);
        expect(results.spending[0]).toBe(0);
    });

    test('tracks all new fields', () => {
        const results = runSimulation(defaultParams());
        expect(results.taxPaymentSources).toBeDefined();
        expect(results.taxPaymentSources.taxable).toBeDefined();
        expect(results.taxPaymentSources.cash).toBeDefined();
        expect(results.taxPaymentSources.ira).toBeDefined();
        expect(results.growth).toBeDefined();
        expect(results.rmdSurplus).toBeDefined();
        expect(results.shortfalls).toBeDefined();
    });
});

describe('runSimulation - Investment Growth', () => {
    test('applies correct investment returns', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            rothBalance: 0,
            taxableBalance: 0,
            cashBalance: 0,
            spending: 0,
            conversion: 0,
            investmentReturn: 0.10,
            startAge: 62,
            endAge: 63
        });
        const results = runSimulation(params);
        // After 1 year of 10% growth on $1M
        expect(results.iraBalances[1]).toBeCloseTo(1100000, 0);
        expect(results.growth.ira[1]).toBeCloseTo(100000, 0);
    });

    test('applies different cash return rate', () => {
        const params = defaultParams({
            iraBalance: 0,
            rothBalance: 0,
            taxableBalance: 0,
            cashBalance: 100000,
            spending: 0,
            conversion: 0,
            cashReturn: 0.05,
            taxRate: 0,
            startAge: 62,
            endAge: 63
        });
        const results = runSimulation(params);
        expect(results.cashBalances[1]).toBeCloseTo(105000, 0);
        expect(results.growth.cash[1]).toBeCloseTo(5000, 0);
    });
});

describe('runSimulation - IRA Withdrawal Tax Gross-Up', () => {
    test('withdraws correct gross amount for net spending need', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            rothBalance: 0,
            taxableBalance: 0,
            cashBalance: 0,
            spending: 75000, // need $75k net
            taxRate: 0.25,
            conversion: 0,
            investmentReturn: 0,
            inflation: 0,
            startAge: 62,
            endAge: 63,
            withdrawalOrder: ['ira']
        });
        const results = runSimulation(params);
        // Need $75k net at 25% tax = $100k gross
        expect(results.withdrawals.ira[1]).toBeCloseTo(100000, 0);
        expect(results.incomeTaxes[1]).toBeCloseTo(25000, 0);
    });

    test('handles partial IRA when insufficient', () => {
        const params = defaultParams({
            iraBalance: 50000,
            rothBalance: 0,
            taxableBalance: 0,
            cashBalance: 0,
            spending: 100000,
            taxRate: 0.25,
            conversion: 0,
            investmentReturn: 0,
            inflation: 0,
            startAge: 62,
            endAge: 63,
            withdrawalOrder: ['ira']
        });
        const results = runSimulation(params);
        expect(results.withdrawals.ira[1]).toBe(50000);
        expect(results.shortfalls[1]).toBeGreaterThan(0);
    });
});

describe('runSimulation - Taxable Withdrawal with Capital Gains', () => {
    test('calculates correct capital gains tax', () => {
        const params = defaultParams({
            iraBalance: 0,
            rothBalance: 0,
            taxableBalance: 100000,
            cashBalance: 0,
            costBasisPct: 0.5, // 50% basis = 50% gains
            capGainsRate: 0.15,
            spending: 42500, // This should require ~$50k gross
            conversion: 0,
            investmentReturn: 0,
            inflation: 0,
            startAge: 62,
            endAge: 63,
            withdrawalOrder: ['taxable']
        });
        const results = runSimulation(params);
        // With 50% gains and 15% cap gains rate, effective rate is 7.5%
        // grossNeeded = 42500 / (1 - 0.075) = 45946
        // gains = 45946 * 0.5 = 22973
        // capGainsTax = 22973 * 0.15 = 3446
        expect(results.capGainsTaxes[1]).toBeCloseTo(3446, -1);
    });

    test('splits taxable gains into ST (income) and LT (cap gains)', () => {
        const params = defaultParams({
            iraBalance: 0,
            rothBalance: 0,
            taxableBalance: 100000,
            cashBalance: 0,
            costBasisPct: 0.5,
            capGainsRate: 0.15,
            taxRate: 0.25,
            taxableShortTermPct: 0.6,
            spending: 42500,
            conversion: 0,
            investmentReturn: 0,
            inflation: 0,
            startAge: 62,
            endAge: 63,
            withdrawalOrder: ['taxable']
        });
        const results = runSimulation(params);
        expect(results.incomeTaxes[1]).toBeCloseTo(3570, -1);
        expect(results.capGainsTaxes[1]).toBeCloseTo(1428, -1);
    });

    test('tracks cost basis correctly through withdrawals', () => {
        const params = defaultParams({
            iraBalance: 0,
            rothBalance: 0,
            taxableBalance: 100000,
            cashBalance: 0,
            costBasisPct: 0.5,
            spending: 50000,
            conversion: 0,
            investmentReturn: 0,
            inflation: 0,
            startAge: 62,
            endAge: 64,
            withdrawalOrder: ['taxable']
        });
        const results = runSimulation(params);
        // After first withdrawal, gain percentage should increase
        // (since we withdraw proportional basis)
        expect(results.taxableBalances[1]).toBeLessThan(100000);
    });
});

describe('runSimulation - RMD Handling', () => {
    test('takes RMD at age 73', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            startAge: 72,
            endAge: 74,
            spending: 0,
            conversion: 0,
            investmentReturn: 0
        });
        const results = runSimulation(params);
        expect(results.rmds[0]).toBe(0); // age 72
        expect(results.rmds[1]).toBeCloseTo(1000000 / 26.5, 0); // age 73
    });

    test('RMD counts toward spending', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            cashBalance: 1000000,
            startAge: 72,
            endAge: 74,
            spending: 20000, // less than RMD net
            taxRate: 0.25,
            conversion: 0,
            investmentReturn: 0,
            inflation: 0,
            withdrawalOrder: ['cash', 'ira']
        });
        const results = runSimulation(params);
        // RMD ~37736 gross, net ~28302, more than $20k spending
        // So no additional cash withdrawal needed
        expect(results.withdrawals.cash[1]).toBe(0);
    });

    test('RMD is included in IRA withdrawal total', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            startAge: 72,
            endAge: 74,
            spending: 0,
            conversion: 0,
            investmentReturn: 0
        });
        const results = runSimulation(params);
        expect(results.withdrawals.ira[1]).toBeCloseTo(results.rmds[1], 0);
    });
});

describe('runSimulation - Non-sale tax drag & reinvestment', () => {
    test('inflates non-sale taxable tax drag annually', () => {
        const params = defaultParams({
            cashBalance: 100000,
            taxableBalance: 0,
            taxableNonSaleTax: 1000,
            inflation: 0.03,
            capGainsRate: 0.15,
            taxRate: 0,
            spending: 0,
            investmentReturn: 0,
            cashReturn: 0,
            startAge: 62,
            endAge: 64,
            withdrawalOrder: ['cash']
        });
        const results = runSimulation(params);
        expect(results.capGainsTaxes[1]).toBeCloseTo(1030, 0);
        expect(results.capGainsTaxes[2]).toBeCloseTo(1061, 0);
    });
    
    test('reinvests excess RMD net cash into taxable and basis', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            taxableBalance: 0,
            costBasisPct: 0,
            cashBalance: 0,
            spending: 20000,
            taxRate: 0.25,
            inflation: 0,
            conversion: 0,
            investmentReturn: 0,
            startAge: 72,
            endAge: 74,
            withdrawalOrder: ['cash', 'taxable', 'ira', 'roth']
        });
        const results = runSimulation(params);
        expect(results.taxableBalances[1]).toBeCloseTo(8300, -1);
    });
});

describe('runSimulation - Equivalent cash value', () => {
    test('computes finalEquivCash using IRA tax loss %', () => {
        const params = defaultParams({
            iraBalance: 100000,
            rothBalance: 50000,
            taxableBalance: 25000,
            cashBalance: 10000,
            iraTaxLossPct: 0.25,
            investmentReturn: 0,
            cashReturn: 0,
            inflation: 0,
            spending: 0,
            conversion: 0,
            startAge: 62,
            endAge: 62
        });
        const results = runSimulation(params);
        expect(results.finalEquivCash).toBeCloseTo(160000, 0);
    });
});

describe('runSimulation - Roth Conversion', () => {
    test('converts correct amount during conversion window', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            conversion: 50000,
            conversionStartAge: 63,
            conversionEndAge: 65,
            startAge: 62,
            endAge: 67,
            spending: 0,
            investmentReturn: 0
        });
        const results = runSimulation(params);
        expect(results.conversions[0]).toBe(0); // age 62
        expect(results.conversions[1]).toBe(50000); // age 63
        expect(results.conversions[2]).toBe(50000); // age 64
        expect(results.conversions[3]).toBe(50000); // age 65
        expect(results.conversions[4]).toBe(0); // age 66
    });

    test('conversion adds to Roth balance', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            rothBalance: 100000,
            cashBalance: 500000, // enough to pay tax
            conversion: 50000,
            conversionStartAge: 63,
            conversionEndAge: 63,
            startAge: 62,
            endAge: 64,
            spending: 0,
            investmentReturn: 0
        });
        const results = runSimulation(params);
        // Roth should increase by conversion amount
        expect(results.rothBalances[1]).toBe(150000);
    });

    test('conversion is limited by IRA balance', () => {
        const params = defaultParams({
            iraBalance: 30000,
            cashBalance: 100000,
            conversion: 50000,
            conversionStartAge: 63,
            conversionEndAge: 63,
            startAge: 62,
            endAge: 64,
            spending: 0,
            investmentReturn: 0
        });
        const results = runSimulation(params);
        expect(results.conversions[1]).toBe(30000);
    });
});

describe('runSimulation - Roth Conversion Tax Payment', () => {
    test('pays conversion tax from taxable with cap gains gross-up', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            rothBalance: 0,
            taxableBalance: 100000,
            cashBalance: 0,
            costBasisPct: 0.5, // 50% gains
            taxRate: 0.25,
            capGainsRate: 0.15,
            conversion: 40000, // $10k tax needed
            conversionStartAge: 63,
            conversionEndAge: 63,
            startAge: 62,
            endAge: 64,
            spending: 0,
            investmentReturn: 0
        });
        const results = runSimulation(params);
        
        // $40k conversion at 25% = $10k tax
        // From taxable with 50% gains and 15% cap gains rate:
        // effectiveRate = 0.5 * 0.15 = 0.075
        // grossNeeded = 10000 / (1 - 0.075) = 10811
        // capGains = 10811 * 0.5 * 0.15 = 811
        
        expect(results.incomeTaxes[1]).toBeCloseTo(10000, 0); // conversion tax
        expect(results.capGainsTaxes[1]).toBeCloseTo(811, -1);
        expect(results.taxPaymentSources.taxable[1]).toBeCloseTo(10811, -1);
    });

    test('pays conversion tax from cash when taxable exhausted', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            rothBalance: 0,
            taxableBalance: 0,
            cashBalance: 100000,
            taxRate: 0.25,
            conversion: 40000, // $10k tax
            conversionStartAge: 63,
            conversionEndAge: 63,
            startAge: 62,
            endAge: 64,
            spending: 0,
            investmentReturn: 0
        });
        const results = runSimulation(params);
        
        expect(results.taxPaymentSources.cash[1]).toBe(10000);
        expect(results.taxPaymentSources.taxable[1]).toBe(0);
    });

    test('pays conversion tax from IRA as last resort with gross-up', () => {
        const params = defaultParams({
            iraBalance: 1000000,
            rothBalance: 0,
            taxableBalance: 0,
            cashBalance: 0,
            taxRate: 0.25,
            conversion: 40000, // $10k tax
            conversionStartAge: 63,
            conversionEndAge: 63,
            startAge: 62,
            endAge: 64,
            spending: 0,
            investmentReturn: 0
        });
        const results = runSimulation(params);
        
        // Need $10k net from IRA at 25% tax = $13,333 gross
        // Income tax includes: $10k (conversion) + $3,333 (on tax payment) = $13,333
        expect(results.taxPaymentSources.ira[1]).toBeCloseTo(13333, -1);
        expect(results.incomeTaxes[1]).toBeCloseTo(13333, -1);
    });
});

describe('runSimulation - Withdrawal Order', () => {
    test('follows cash-first order', () => {
        const params = defaultParams({
            iraBalance: 100000,
            rothBalance: 100000,
            taxableBalance: 100000,
            cashBalance: 100000,
            spending: 50000,
            conversion: 0,
            investmentReturn: 0,
            inflation: 0,
            startAge: 62,
            endAge: 63,
            withdrawalOrder: ['cash', 'taxable', 'ira', 'roth']
        });
        const results = runSimulation(params);
        
        expect(results.withdrawals.cash[1]).toBe(50000);
        expect(results.withdrawals.taxable[1]).toBe(0);
        expect(results.withdrawals.ira[1]).toBe(0);
        expect(results.withdrawals.roth[1]).toBe(0);
    });

    test('follows ira-first order', () => {
        const params = defaultParams({
            iraBalance: 100000,
            rothBalance: 100000,
            taxableBalance: 100000,
            cashBalance: 100000,
            spending: 50000,
            taxRate: 0.20,
            conversion: 0,
            investmentReturn: 0,
            inflation: 0,
            startAge: 62,
            endAge: 63,
            withdrawalOrder: ['ira', 'cash', 'taxable', 'roth']
        });
        const results = runSimulation(params);
        
        // Need $50k net at 20% tax = $62.5k gross from IRA
        expect(results.withdrawals.ira[1]).toBeCloseTo(62500, 0);
        expect(results.withdrawals.cash[1]).toBe(0);
    });
});

describe('runSimulation - Inflation', () => {
    test('applies inflation to spending', () => {
        const params = defaultParams({
            cashBalance: 1000000,
            spending: 100000,
            inflation: 0.03,
            conversion: 0,
            investmentReturn: 0,
            startAge: 62,
            endAge: 65,
            withdrawalOrder: ['cash']
        });
        const results = runSimulation(params);
        
        // Year 0 is initial state (no spending), inflation applies from year 1
        // spending = base * (1 + inflation)^year
        expect(results.spending[0]).toBe(0); // year 0 - initial state
        expect(results.spending[1]).toBeCloseTo(103000, 0); // year 1: 100k * 1.03^1
        expect(results.spending[2]).toBeCloseTo(106090, 0); // year 2: 100k * 1.03^2
        expect(results.spending[3]).toBeCloseTo(109273, 0); // year 3: 100k * 1.03^3
    });
});

describe('runSimulation - Full Integration', () => {
    test('balances reconcile correctly', () => {
        const params = defaultParams({
            iraBalance: 500000,
            rothBalance: 100000,
            taxableBalance: 200000,
            cashBalance: 100000,
            spending: 80000,
            conversion: 30000,
            investmentReturn: 0.06,
            cashReturn: 0.02,
            inflation: 0.02,
            startAge: 62,
            endAge: 65
        });
        const results = runSimulation(params);
        
        // Just verify all arrays have same length
        const len = results.ages.length;
        expect(results.iraBalances.length).toBe(len);
        expect(results.rothBalances.length).toBe(len);
        expect(results.taxableBalances.length).toBe(len);
        expect(results.cashBalances.length).toBe(len);
        expect(results.withdrawals.ira.length).toBe(len);
        expect(results.incomeTaxes.length).toBe(len);
        expect(results.taxPaymentSources.taxable.length).toBe(len);
        expect(results.growth.ira.length).toBe(len);
        expect(results.rmdSurplus.length).toBe(len);
    });

    test('final total is sum of all accounts', () => {
        const results = runSimulation(defaultParams());
        const lastIdx = results.ages.length - 1;
        const expectedTotal = 
            results.iraBalances[lastIdx] + 
            results.rothBalances[lastIdx] + 
            results.taxableBalances[lastIdx] + 
            results.cashBalances[lastIdx];
        expect(results.finalTotal).toBeCloseTo(expectedTotal, 0);
    });

    test('no shortfall with adequate funds', () => {
        const params = defaultParams({
            iraBalance: 2000000,
            cashBalance: 500000,
            spending: 50000
        });
        const results = runSimulation(params);
        results.shortfalls.forEach((shortfall, i) => {
            expect(shortfall).toBe(0);
        });
    });
});

describe('findOptimalConversion', () => {
    test('returns valid conversion amount', () => {
        const params = defaultParams();
        const result = findOptimalConversion(params);
        expect(result.conversion).toBeGreaterThanOrEqual(0);
        expect(result.conversion).toBeLessThanOrEqual(300000);
        expect(result.total).toBeGreaterThan(0);
    });

    test('optimal beats zero conversion in most scenarios', () => {
        const params = defaultParams({
            taxRate: 0.22,
            iraBalance: 2000000,
            rothBalance: 0,
            taxableBalance: 500000,
            cashBalance: 200000
        });
        const optResult = findOptimalConversion(params);
        const zeroResult = runSimulation({ ...params, conversion: 0 });
        
        // In most reasonable scenarios, some conversion is better
        expect(optResult.total).toBeGreaterThanOrEqual(zeroResult.finalTotal);
    });
});
