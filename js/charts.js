// Chart instances
let valuesChart, withdrawalsChart, taxesChart;

// Initialize charts
function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#94a3b8',
                    font: { family: 'DM Sans' }
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(42, 58, 80, 0.5)' },
                ticks: { color: '#64748b' }
            },
            y: {
                grid: { color: 'rgba(42, 58, 80, 0.5)' },
                ticks: {
                    color: '#64748b',
                    callback: value => formatCurrency(value)
                }
            }
        }
    };
    
    // Values chart
    valuesChart = new Chart(document.getElementById('valuesChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Traditional IRA',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Roth IRA',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Taxable',
                    data: [],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Cash',
                    data: [],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: chartOptions
    });
    
    // Withdrawals chart
    withdrawalsChart = new Chart(document.getElementById('withdrawalsChart'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Cash',
                    data: [],
                    backgroundColor: 'rgba(245, 158, 11, 0.7)'
                },
                {
                    label: 'Taxable',
                    data: [],
                    backgroundColor: 'rgba(139, 92, 246, 0.7)'
                },
                {
                    label: 'IRA',
                    data: [],
                    backgroundColor: 'rgba(59, 130, 246, 0.7)'
                },
                {
                    label: 'Roth',
                    data: [],
                    backgroundColor: 'rgba(16, 185, 129, 0.7)'
                }
            ]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                x: { ...chartOptions.scales.x, stacked: true },
                y: { ...chartOptions.scales.y, stacked: true }
            }
        }
    });
    
    // Taxes chart
    taxesChart = new Chart(document.getElementById('taxesChart'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Income Tax',
                    data: [],
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                },
                {
                    label: 'Capital Gains',
                    data: [],
                    backgroundColor: 'rgba(251, 146, 60, 0.7)',
                    borderColor: '#fb923c',
                    borderWidth: 1
                }
            ]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                x: { ...chartOptions.scales.x, stacked: true },
                y: { ...chartOptions.scales.y, stacked: true }
            }
        }
    });
}

// Update charts with new data
function updateCharts(results) {
    valuesChart.data.labels = results.ages;
    valuesChart.data.datasets[0].data = results.iraBalances;
    valuesChart.data.datasets[1].data = results.rothBalances;
    valuesChart.data.datasets[2].data = results.taxableBalances;
    valuesChart.data.datasets[3].data = results.cashBalances;
    valuesChart.update('none');
    
    withdrawalsChart.data.labels = results.ages;
    withdrawalsChart.data.datasets[0].data = results.withdrawals.cash;
    withdrawalsChart.data.datasets[1].data = results.withdrawals.taxable;
    withdrawalsChart.data.datasets[2].data = results.withdrawals.ira;
    withdrawalsChart.data.datasets[3].data = results.withdrawals.roth;
    withdrawalsChart.update('none');
    
    taxesChart.data.labels = results.ages;
    taxesChart.data.datasets[0].data = results.incomeTaxes;
    taxesChart.data.datasets[1].data = results.capGainsTaxes;
    taxesChart.update('none');
}

