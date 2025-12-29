# Retirement Portfolio Drawdown Optimizer

A comprehensive single-page web application for optimizing retirement portfolio withdrawals, Roth conversions, and tax strategies.

## What It Does

This tool helps retirees (and those planning for retirement) answer critical questions like:
- How much should I convert to Roth each year?
- What's the most tax-efficient order to withdraw from my accounts?
- How will Required Minimum Distributions (RMDs) affect my strategy?
- What will my portfolio look like at age 85 under different scenarios?

## Features

### Account Modeling
Simulates 4 account types with realistic tax treatment:
- **Traditional IRA** - Pre-tax, taxed on withdrawal, subject to RMDs at 73
- **Roth IRA** - Post-tax, tax-free withdrawals
- **Taxable Brokerage** - After-tax with capital gains taxation
- **Cash/Money Market** - Liquid savings with lower returns

### Interactive Controls
Adjustable parameters via sliders:
- Starting balances for all 4 accounts
- Tax rate (income) and capital gains tax rate
- Investment returns and inflation rate
- Annual spending needs
- Roth conversion amounts and timing (start/end age)
- Simulation end age (75-95)
- Cost basis percentage for taxable account

### Withdrawal Order Optimization
Compare 12+ different withdrawal strategies to find the optimal sequence:
- Default tax-efficient: Cash → Taxable → IRA → Roth
- Test alternatives like IRA-first or Roth-first strategies
- See ranked comparison of all strategies with dollar differences

### Roth Conversion Optimization
Find the optimal annual Roth conversion amount to maximize total portfolio value:
- Grid search from $0 to $300k in $5k increments
- Fine-tuned to $1k precision
- Accounts for conversion taxes paid from post-tax accounts

### Required Minimum Distributions (RMDs)
Accurate RMD calculations using IRS Uniform Lifetime Table:
- Automatically kicks in at age 73 (per SECURE Act 2.0)
- RMDs are taken before other spending withdrawals
- Highlighted in the yearly breakdown table

### Visualizations
Three interactive Chart.js graphs:
1. **Account Values Over Time** - Line chart showing portfolio evolution
2. **Annual Withdrawals** - Stacked bar chart by account source
3. **Annual Taxes** - Stacked bar chart (income tax vs capital gains)

### Pre-built Scenarios
Quick buttons for common analysis scenarios:
1. $50k Roth conversion, 25% tax rate
2. $100k Roth conversion, 25% tax rate
3. Find optimal Roth conversion (automated search)
4. $50k conversion with 20% tax rate
5. $50k conversion with 15% investment return

### Detailed Yearly Breakdown
Enhanced table with sticky headers and four organized sections:

**BALANCES** - End-of-year account values (IRA, Roth, Taxable, Cash)

**SPENDING SOURCES** - Net amounts used for spending (after taxes):
- Shows exactly how much cash you get from each account
- IRA spending includes RMD net amounts
- Makes it clear where your spending money comes from

**TAXES** - Tax liabilities and payment sources:
- Income tax and capital gains tax totals
- Shows which accounts paid the taxes (Cash, Taxable, IRA)
- IRA tax column shows total: tax withheld + IRA used to pay other taxes

**IRA ACTIVITY** - Gross IRA transactions:
- Total IRA withdrawals (gross amount before taxes)
- RMD amounts (color-coded: green = voluntary excess, red = forced withdrawal)
- RMD surplus reinvested to taxable account
- Roth conversions

The table makes it easy to see the flow: Gross IRA withdrawal → Tax withheld → Net for spending

## Default Assumptions

| Parameter | Default Value |
|-----------|---------------|
| Traditional IRA | $2,000,000 |
| Roth IRA | $0 |
| Taxable Brokerage | $500,000 |
| Cash | $200,000 |
| Starting Age | 62 |
| End Age | 85 |
| Tax Rate | 25% |
| Capital Gains Rate | 15% |
| Investment Return | 8% |
| Cash Return | 3% |
| Inflation | 3% |
| Annual Spending | $100,000 |
| Roth Conversion | $50,000/year |
| Conversion Period | Ages 63-68 |
| RMD Start Age | 73 |

## File Structure

```
/Retirement Optimization/
├── index.html          # Main HTML structure
├── styles.css          # All CSS styling
├── js/
│   ├── simulation.js   # Core simulation engine, RMDs, optimization
│   ├── charts.js       # Chart.js initialization and updates
│   └── ui.js           # UI controls, event handlers, scenarios
├── netlify.toml        # Netlify deployment config
├── deploy.sh           # Deployment script
├── package.json        # NPM scripts
├── DEPLOY.md           # Deployment instructions
└── README.md           # This file
```

## Technology Stack

- **HTML5** - Semantic markup with sticky table headers
- **CSS3** - Custom properties, gradients, responsive design, advanced table styling
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **Chart.js** - Interactive visualizations (via CDN)
- **Netlify** - Hosting and deployment

## Local Development

Simply open `index.html` in a browser - no build step required.

## Deployment

See [DEPLOY.md](DEPLOY.md) for Netlify deployment instructions.

Quick deploy:
```bash
npm install -g netlify-cli
netlify login
netlify link
./deploy.sh
```

## Simulation Logic

1. **Annual Growth** - Investment returns applied at year start
2. **Tax on Cash Interest** - Cash account interest taxed as ordinary income
3. **Non-Sale Tax Drag** - Annual taxable account dividends/distributions (inflates with inflation)
4. **RMDs** - Calculated and withdrawn first (age 73+), tax withheld at income tax rate
5. **Spending Withdrawals** - Drawn in configured order, with automatic tax gross-up for IRA withdrawals
6. **Roth Conversions** - Executed at year end, taxes paid from post-tax accounts (with gross-up)
7. **Capital Gains Split** - Short-term (taxed at income rate) vs long-term (taxed at cap gains rate)
8. **RMD Surplus Reinvestment** - Excess RMD net cash (after spending) reinvested to taxable with basis step-up

## Limitations

- Assumes constant tax rates (doesn't model tax brackets)
- Simplified capital gains (proportional basis, no specific lot tracking)
- No Social Security income modeling
- No estate planning considerations
- Single simulation (no Monte Carlo for market variability)

## License

MIT

