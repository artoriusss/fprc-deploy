const {log} = console;
let breadcrumbNames = ['Ukraine']; 

var data;
var drilldownLevel = 0;
var levelData = {};
var pcode = {};

var en = '_en';
var country_code = '_EN';

const pointsFull = await fetch(`points.json`).then(response => response.json());
const response = await fetch('adm-levels/adm1.json');
const topology = await response.json();
const dataa = Highcharts.geojson(topology);
const dataInit = dataa.map(item => ({ ...item }));

function addMappointSeries(chart, seriesName, pointsConverted) {
    chart.addSeries({
        type: 'mappoint',
        name: seriesName,
        enableMouseTracking: true,
        turboThreshold: 2000,
        legend: {
            enabled: false
        },
        states: {
            inactive: {
                enabled: false
            }
        },
        dataLabels: {
            enabled: false,
        },
        tooltip: {
            enabled: false
        },
        data: pointsConverted,
        point: {
            events: {
                click: function () {
                    const point = this;

                    // Enable the tooltip and set HTML options directly
                    chart.tooltip.update({
                        enabled: true,
                        useHTML: true,
                        formatter: function () {
                            const point = this.point;

                            const aggregatedPayments = (point.payments || []).reduce((acc, payment) => {
                                const key = `${payment.payer_edrpou}_${payment.receipt_edrpou}`;
                                if (!acc[key]) {
                                    acc[key] = {
                                        payer_edrpou: payment.payer_edrpou,
                                        payer_name: payment.payer_name,
                                        receipt_edrpou: payment.receipt_edrpou,
                                        receipt_name: payment.receipt_name,
                                        programme_type: point.programme_name,
                                        object_type: point.object_type,
                                        total_amount: 0
                                    };
                                }
                                acc[key].total_amount += payment.amount;
                                return acc;
                            }, {});

                            // Count occurrences of each payer_edrpou
                            const payerCounts = {};
                            for (const key in aggregatedPayments) {
                                const edrpou = aggregatedPayments[key].payer_edrpou;
                                if (!payerCounts[edrpou]) {
                                    payerCounts[edrpou] = 0;
                                }
                                payerCounts[edrpou]++;
                            }

                            log(point)

                            let tooltipContent = `
                                <div class="tooltip-content">
                                    <div class="tooltip-section">
                                        <table>
                                            <tr>
                                                <th>District:</th>
                                                <td style="font-weight:500">${point.district_en || ''}</td>
                                            </tr>
                                            <tr>
                                                <th>Hromada:</th>
                                                <td style="font-weight:500">${point.terhromada_en || ''}</td>
                                            </tr>
                                            <tr>
                                                <th>Settlement:</th>
                                                <td style="font-weight:500">${point.settlement_en || ''}</td>
                                            </tr>
                                            <tr>
                                                <th>Address:</th>
                                                <td style="font-weight:500">${point.address}</td>
                                            </tr>
                                            <tr>
                                                <th>Actual:</th>
                                                <td style="font-weight:500">${point.amount_payments ? point.amount_payments.toLocaleString().replaceAll(',', ' ') + ' UAH' : ''}</td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div class="tooltip-section">
                                        <table style="border-collapse: collapse; width: 100%;">
                                            <tr>
                                                <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Payer (ID)</th>
                                                <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Payer</th>
                                                <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Receipt (ID)</th>
                                                <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Recipient</th>
                                                <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Programme</th>
                                                <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Type</th>
                                                <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">UAH</th>
                                            </tr>
                            `;

                            let currentPayer = null;
                            for (const key in aggregatedPayments) {
                                const payment = aggregatedPayments[key];
                                if (payment.payer_edrpou !== currentPayer) {
                                    currentPayer = payment.payer_edrpou;
                                    tooltipContent += `
                                        <tr>
                                            <td rowspan="${payerCounts[payment.payer_edrpou]}" style="border: 1px solid #000; padding: 8px;font-weight:500">${payment.payer_edrpou || ''}</td>
                                            <td rowspan="${payerCounts[payment.payer_edrpou]}" style="border: 1px solid #000; padding: 8px;font-weight:500">${payment.payer_name || ''}</td>
                                            <td style="border: 1px solid #000; padding: 8px;font-weight:500">${payment.receipt_edrpou || ''}</td>
                                            <td style="border: 1px solid #000; padding: 8px;font-weight:500">${payment.receipt_name || ''}</td>
                                            <td style="border: 1px solid #000; padding: 8px;font-weight:500">${payment.programme_type || ''}</td>
                                            <td style="border: 1px solid #000; padding: 8px;font-weight:500">${payment.object_type || ''}</td>
                                            <td style="border: 1px solid #000; padding: 8px;font-weight:500 white-space: nowrap;">${payment.total_amount.toLocaleString().replaceAll(',', ' ') || ''}</td>
                                        </tr> 
                                    `;
                                } else {
                                    tooltipContent += `
                                        <tr>
                                            <td style="border: 1px solid #000; padding: 8px;font-weight:500">${payment.receipt_edrpou || ''}</td>
                                            <td style="border: 1px solid #000; padding: 8px;font-weight:500">${payment.receipt_name || ''}</td>
                                            <td style="border: 1px solid #000; padding: 8px;font-weight:500">${payment.programme_type || ''}</td>
                                            <td style="border: 1px solid #000; padding: 8px;font-weight:500">${payment.object_type || ''}</td>
                                            <td style="border: 1px solid #000; padding: 8px;font-weight:500; white-space: nowrap;">${payment.total_amount.toLocaleString().replaceAll(',', ' ') || ''}</td>
                                        </tr>
                                    `;
                                }
                            }

                            tooltipContent += `
                                        </table>
                                    </div>
                                </div>
                            `;

                            return tooltipContent;
                        }
                    });

                    point.series.chart.tooltip.refresh(point);
                },
                mouseOut: function () {
                    chart.tooltip.update({
                        enabled: false
                    });
                }
            }
        }
    }, false);

    chart.mapView.update({
        projection: {
            name: 'WebMercator'
        },
    }, false);
    chart.redraw();
    chart.hideLoading();
}

const formatLegendLabel = function(value, space=false) {
    const absValue = Math.abs(value);
    let suffix;
    let label;
    if (absValue >= 1e9) {
        suffix = space ? ' B' : 'B';
        label = (value / 1e9).toFixed() + suffix;
    } else if (absValue >= 1e6) {
        suffix = space ? ' M' : 'M';
        label = (value / 1e6).toFixed() + suffix;
    } else if (absValue >= 1e3) {
        suffix = space ? ' k' : 'k';
        label = (value / 1e3).toFixed() + suffix;
    } else {
        label = value.toString();
    }
    return label;
};

const mapTooltipFormatter = function(options) {
    const region = drilldownLevel === 0 ? 'region': drilldownLevel === 1 ? 'district': drilldownLevel === 2? 'hromada': '';
    return `<b>${options.properties[`ADM${drilldownLevel+1}_EN`]}</b> ${region}<br>Costs: ${options.value.toLocaleString()} UAH`.replaceAll(',', ' ');;
};

const initializeDropdownOptions = async function(selectElementId, pts, propertyValueKey, propertyLabelKey, update) {
    const selectElement = document.getElementById(selectElementId);
    const valueLabelMapper = pts.reduce((acc, item) => {
        const value = item[propertyValueKey];
        const label = item[propertyLabelKey];
        if (value && label) {
            acc[value] = label;
        }
        return acc;
    }, {});

    const currentSelectedValue = selectElement.value;

    while (selectElement.options.length > 0) {
        selectElement.remove(0);
    }

    const allOptionsEl = document.createElement('option');
    allOptionsEl.value = 'all';
    allOptionsEl.textContent = 'All';
    selectElement.appendChild(allOptionsEl);

    Object.entries(valueLabelMapper).forEach(([value, label]) => {
        const optionElement = document.createElement('option');
        optionElement.value = value;
        optionElement.textContent = label;
        selectElement.appendChild(optionElement);
    });

    if (update) {
        if (selectElement.querySelector(`option[value="${currentSelectedValue}"]`)) {
            selectElement.value = currentSelectedValue;
        } else {
            selectElement.value = 'all';
        }
    } else {
        selectElement.value = 'all';
    }
    selectElement.dataset.selectedValue = selectElement.value;
};

const initializeNestedDropdownOptions = async function(selectElementId, pts, propertyKey, update) {
    const selectElement = document.getElementById(selectElementId);
    const valueLabelMapper = pts.reduce((acc, point) => {
        point.payments.forEach(payment => {
            const value = payment[propertyKey];
            const label = payment[propertyKey]; // Assuming the EDRPOU code is used as both the value and the label
            if (value) {
                acc[value] = label;
            }
        });
        return acc;
    }, {});

    const currentSelectedValue = selectElement.value;

    while (selectElement.options.length > 0) {
        selectElement.remove(0);
    }

    const allOptionsEl = document.createElement('option');
    allOptionsEl.value = 'all';
    allOptionsEl.textContent = 'All';
    selectElement.appendChild(allOptionsEl);

    Object.entries(valueLabelMapper).forEach(([value, label]) => {
        const optionElement = document.createElement('option');
        optionElement.value = value;
        optionElement.textContent = label;
        selectElement.appendChild(optionElement);
    });

    if (update) {
        if (selectElement.querySelector(`option[value="${currentSelectedValue}"]`)) {
            selectElement.value = currentSelectedValue;
        } else {
            selectElement.value = 'all';
        }
    } else {
        selectElement.value = 'all';
    }
    selectElement.dataset.selectedValue = selectElement.value;
};
  
const initializeAllDropdowns = async function (pts, update = false) {
    initializeDropdownOptions('program-type', pts, 'kpk', 'programme_name', update);
    initializeDropdownOptions('obj-category', pts, 'object_type', 'object_type', update);
    initializeNestedDropdownOptions('payer-edrpou', pts, 'payer_edrpou', update);
    initializeNestedDropdownOptions('receipt-edrpou', pts, 'receipt_edrpou', update);
};

function getFilterKey(selectElementId) {
    switch (selectElementId) {
        case 'program-type':
            return ['kpk', 'programme_name'];
        case 'obj-category':
            return ['object_type', 'object_type'];
        case 'payer-edrpou':
            return ['payer_edrpou', 'payer_edrpou'];
        case 'receipt-edrpou':
            return ['receipt_edrpou', 'receipt_edrpou'];
        default:
            return null;
    }
}
  
function resetFilter(selectElementId) {
    const { 0: valueKey, 1: labelKey } = getFilterKey(selectElementId);
    initializeDropdownOptions(selectElementId, pointsFull, valueKey, labelKey, false);
    updateCharts(pcode[`${drilldownLevel}`]);
}

function resetAllFilters() {
    const selectElementIds = [
        'obj-category',
        'program-type',
        'payer-edrpou',
        'receipt-edrpou'
    ];
    selectElementIds.forEach(selectElementId => resetFilter(selectElementId));
}

await initializeAllDropdowns(pointsFull, false);

// METRICS LOGIC 
const formatNumberToText = (num) => {
    const absNum = Math.abs(num);
    let formattedNumber;
    let suffix;

    if (absNum >= 1e9) {
        formattedNumber = (num / 1e9).toFixed(1);
        suffix = 'bln';
    } else if (absNum >= 1e6) {
        formattedNumber = (num / 1e6).toFixed(1);
        suffix = 'mln';
    } else if (absNum >= 1e3) {
        formattedNumber = (num / 1e3).toFixed(1);
        suffix = 'k';
    } else {
        formattedNumber = num.toString();
        suffix = '';
    }

    // Remove trailing '.0' if it exists
    if (formattedNumber.endsWith('.0')) {
        formattedNumber = formattedNumber.slice(0, -2);
    }

    return `${formattedNumber} ${suffix}`;
};
const updateMetrics = async function (pts){
    let plannedBudgetTotal = 0;
    let totalSpent = 0;

    pts.forEach(point => {
        plannedBudgetTotal += point.amount_decision ? point.amount_decision : 0;
        point.payments.forEach(payment => {
            totalSpent += payment.amount ? payment.amount : 0;
        });
    });

    document.getElementById('planned-budget').textContent = formatNumberToText(plannedBudgetTotal);;
    document.getElementById('total-spent').textContent = formatNumberToText(totalSpent);
    document.getElementById('state-spent').textContent = formatNumberToText(totalSpent);
}

// TABLES LOGIC 
const updateTable = async function (pts) {
    const aggregateData = pts.reduce((acc, point) => {
        if (!acc[point.programme_name]) {
            acc[point.programme_name] = {
                numberOfObjects: 0,
                totalAmount: 0,
                totalDecisionAmount: 0 // Initialize total decision amount
            };
        }
        acc[point.programme_name].numberOfObjects += 1;
        const totalAmount = point.payments.reduce((sum, payment) => sum + payment.amount, 0);
        acc[point.programme_name].totalAmount += totalAmount;
        acc[point.programme_name].totalDecisionAmount += point.amount_decision; // Aggregate decision amount
        return acc;
    }, {});

    const tableBody = document.getElementById('programs-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ""; 

    for (const [programme, data] of Object.entries(aggregateData)) {
        const row = tableBody.insertRow();
        const programCell = row.insertCell();
        const numberCell = row.insertCell();
        const decisionAmountCell = row.insertCell();
        const amountCell = row.insertCell();

        programCell.textContent = programme;
        numberCell.textContent = data.numberOfObjects;
        decisionAmountCell.textContent = formatNumberToText(data.totalDecisionAmount);
        amountCell.textContent = formatNumberToText(data.totalAmount);

        programCell.style.textAlign = 'left';
        numberCell.style.textAlign = 'center';
        amountCell.style.textAlign = 'right';
        decisionAmountCell.style.textAlign = 'right';
    }
};

function hideObjectsTable() {
    const table = document.getElementById('objects-table');
    table.style.display = 'none';
};

function displayObjectsTable(pts) {
    const table = document.getElementById('objects-table');
    table.style.display = ''; 

    const tableBody = table.getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';
    pts.forEach(item => {
        const row = tableBody.insertRow();
        
        const addressCell = row.insertCell();
        addressCell.textContent = `${item.street}, ${item.building}` 

        const objectTypeCell = row.insertCell();
        objectTypeCell.textContent = item.object_type;
        objectTypeCell.style.textAlign = 'center';

        const decisionCell = row.insertCell();
        decisionCell.textContent = item.amount_decision.toLocaleString().replaceAll(',', ' '); 
        decisionCell.style.textAlign = 'right';

        const amountCell = row.insertCell();
        amountCell.textContent = item.amount.toLocaleString().replaceAll(',', ' ');
        amountCell.style.textAlign = 'right';

        const percentageCell = row.insertCell();
        const percentage = item.amount_decision ? (item.amount / item.amount_decision * 100).toFixed(1) : 0;
        percentageCell.textContent = `${percentage}%`;
        percentageCell.style.textAlign = 'right';
    });
};

// BAR CHART LOGIC
const formatBarData = function (points, aggregateBy) {
    const barColour = aggregateBy === 'payer_name' ? "#00457e" : '#ffbd01';
    const barLabel = aggregateBy === 'payer_name' ? 'Payer' : 'Recipient';
    const aggregatedData = {};

    points.forEach(point => {
        point.payments.forEach(payment => {
            const key = aggregateBy === 'payer_name' ? payment.payer_name : payment.receipt_name;
            if (aggregatedData[key]) {
                aggregatedData[key] += payment.amount;
            } else {
                aggregatedData[key] = payment.amount;
            }
        });
    });

    const sortedData = Object.keys(aggregatedData)
        .map(key => ({ name: key, amount: aggregatedData[key] }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

    const seriesData = sortedData.map(item => item.amount);
    const categories = sortedData.map(item => item.name);

    const series = {
        name: barLabel,
        color: barColour,
        data: seriesData
    };
    return { series, categories };
};

const updateBarChart = async function (pts) {
    const { series: receiptSeries, categories: receiptCategories } = formatBarData(pts, 'receipt_name');
    const { series: payerSeries, categories: payerCategories } = formatBarData(pts, 'payer_name');
    Highcharts.charts[3].series[0].setData(payerSeries.data);
    Highcharts.charts[4].series[0].setData(receiptSeries.data);
    Highcharts.charts[3].axes[0].setCategories(payerCategories);
    Highcharts.charts[4].axes[0].setCategories(receiptCategories);
};

// LINE CHART LOGIC
const formatTsData = function (points) {
    let monthData = points.reduce((acc, point) => {
        point.payments.forEach(payment => {
            let date = new Date(payment.trans_date * 1000);
            let yearMonthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
            let amount = payment.amount; 

            if (!acc[yearMonthKey]) {
                acc[yearMonthKey] = {
                    total: 0,
                    timestamp: Date.UTC(date.getUTCFullYear(), date.getUTCMonth())
                };
            }
            
            acc[yearMonthKey].total += amount;
        });
        
        return acc;
    }, {});

    // Ensure all months in the range are represented, even with total 0
    let minDate = new Date(Math.min(...Object.values(monthData).map(entry => entry.timestamp)));
    let maxDate = new Date(Math.max(...Object.values(monthData).map(entry => entry.timestamp)));
    
    for (let year = minDate.getUTCFullYear(); year <= maxDate.getUTCFullYear(); year++) {
        for (let month = 0; month < 12; month++) {
            let yearMonthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
            if (!monthData[yearMonthKey]) {
                monthData[yearMonthKey] = {
                    total: 0,
                    timestamp: Date.UTC(year, month)
                };
            }
        }
    }

    let timestamps = Object.values(monthData).map(entry => entry.timestamp);
    let pointStart = Math.min(...timestamps);

    let aggregatedData = Object.keys(monthData)
        .sort((a, b) => monthData[a].timestamp - monthData[b].timestamp)
        .map(yearMonth => ({
            x: monthData[yearMonth].timestamp,
            y: monthData[yearMonth].total
        }));

    return {
        series: [{
            name: 'Усього за місяць', 
            pointStart: pointStart,
            pointInterval: 30 * 24 * 3600 * 1000, 
            data: aggregatedData
        }]
    };
};

const updateLineChart = async function (pts) {
    const tsData = formatTsData(pts);
    Highcharts.charts[2].series[0].setData(tsData.series[0].data);
};

// TREEMAP LOGIC
const calculateColorValue = (value) => {
    const scaleFactor = 0.1;
    return value * scaleFactor;
};

const getValuesByObjCategory = function(points) {
    const aggregatedByCategory = points.reduce((acc, point) => {
        const { object_type, payments } = point;

        // Aggregate the amounts for each payment
        const totalAmountByCategory = payments.reduce((sum, payment) => sum + payment.amount, 0);

        if (!acc[object_type]) {
            acc[object_type] = 0;
        }
        acc[object_type] += totalAmountByCategory;
        return acc;
    }, {});

    const categoryValuesArray = Object.keys(aggregatedByCategory).map((key) => ({
        name: key,
        value: aggregatedByCategory[key],
        colorValue: calculateColorValue(aggregatedByCategory[key]) 
    }));

    return categoryValuesArray;
};

const updateTreeMap = async function (pts) {
    const valuesByCategory = getValuesByObjCategory(pts);
    Highcharts.charts[1].series[0].setData(valuesByCategory);
};

// UPDATE CHARTS LOGIC
const updateCharts = async function (pcode) {
    const pts = await testFilterByCategories(pcode)//pcode ? await filterPointsByPcode(pcode) : await testFilterByCategories();
    updateTreeMap(pts);
    updateLineChart(pts);
    updateBarChart(pts);
    updateTable(pts);
    updateMetrics(pts);
    initializeAllDropdowns(pts, true);
    if (drilldownLevel === 4) {
        displayObjectsTable(pts);
    } else if (drilldownLevel === 2) {
        hideObjectsTable();
    }
};

// MAP LOGIC
const getFilteredMappoints = async function () {
    let points = await fetch(`points.json`).then(response => response.json());
    points = await testFilterByCategories();

    const maxAmount = Math.max(...points.map(p => p.amount)); 
    const minRadius = 10; 
    const maxRadius = 60; 

    const scale_factor = (maxRadius - minRadius) / Math.sqrt(maxAmount);

    const calculateRadius = (amount) => {
        return Math.sqrt(amount) * scale_factor + minRadius;
    };

    points = points.map(obj => ({
        ...obj,
        lat: obj.latitude,
        lon: obj.longitude,
        marker: {
            radius: calculateRadius(obj.amount),
            fillColor: 'rgba(25, 77, 119, 0.8)',
            symbol: 'circle'
        }
    }));
    return points;
};

const filterByCategories = async function () {
    const points = await fetch(`points.json`).then(response => response.json());

    const objectCategory = document.getElementById('obj-category').value;
    const programType = document.getElementById('program-type').value;
    const payerEdrpou = document.getElementById('payer-edrpou').value;
    const receiptEdrpou = document.getElementById('receipt-edrpou').value;

    const filteredPoints = points.filter(point => {
        const matchesObjectCategory = objectCategory === 'all' || point.object_type === objectCategory;
        const matchesProgramType = programType === 'all' || point.kpk == programType;
        const matchesPayerEdrpou = payerEdrpou === 'all' || point.payer_edrpou == payerEdrpou; 
        const matchesReceiptEdrpou = receiptEdrpou === 'all' || point.receipt_edrpou == receiptEdrpou;
        return matchesObjectCategory &&  matchesProgramType && matchesPayerEdrpou && matchesReceiptEdrpou;
    });
    console.log(`Filtering by ${objectCategory}, ${payerEdrpou}, ${receiptEdrpou} ${programType}`)
    return filteredPoints;
};

const getDrilldownLevel = function (length) {
    return length > 9 ? 4 : length > 6 ? 3 : length > 4 ? 2 : 1;
};

const aggregateByPcode = async function (data) {
    const points = await testFilterByCategories(); 
    data.forEach((d) => {
        d.value = 0; 
        d.drilldown = d.properties[`ADM${drilldownLevel+1}_PCODE`];
        points.forEach(p => {
            if (d.properties[`ADM${drilldownLevel+1}_PCODE`] === p[`adm${drilldownLevel+1}_pcode`]) {
                d.value += p.amount;
            }
        });
        d.value = d.value === 0 ? 0 : d.value;
    });
    return data;
};

const drilldown = async function (e) {
    if (!e.seriesOptions) {
        const chart = this;
        const level = getDrilldownLevel(e.point.drilldown.length);
        drilldownLevel = level;
        pcode[`${level}`] =  e.point.properties[`ADM${drilldownLevel}_PCODE`];
        updateCharts(pcode[`${level}`]);

        if (level === 4) {
            chart.update({
                legend: {
                    enabled: false
                }
            }, false);
            const seriesName = e.point.properties[`ADM${drilldownLevel}_EN`];
            breadcrumbNames.push(seriesName);
            chart.update({
                mapView: {
                    projection: {
                        name: 'WebMercator'
                    }
                }
            }, false);
        
            let pointsConverted = await getFilteredMappoints();
        
            console.log('First converted point:', pointsConverted[0]);
        
            while (chart.series.length > 0) {
                chart.series[0].remove(false);
            }
        
            chart.addSeries({
                type: 'tiledwebmap',
                name: 'TWM Tiles',
                provider: {
                    type: 'OpenStreetMap',
                    theme: 'Standard'
                },
                legend: {
                    enabled: false
                },
                color: 'rgba(128,128,128,0.3)'
            }, false);
        
            // chart.addSeries({
            //     type: 'mappoint',
            //     name: seriesName,
            //     enableMouseTracking: true,
            //     legend: {
            //         enabled: false
            //     },
            //     states: {
            //         inactive: {
            //             enabled: false
            //         }
            //     },
            //     dataLabels: {
            //         enabled: false,
            //     },
            //     tooltip: {
            //         enabled: false
            //     },
            //     data: pointsConverted,
            //     point: {
            //         events: {
            //             click: function () {
            //                 const point = this;
        
            //                 // Enable the tooltip and set HTML options directly
            //                 chart.tooltip.update({
            //                     enabled: true,
            //                     useHTML: true,
            //                     formatter: function () {
            //                         const point = this.point;
        
            //                         const aggregatedPayments = (point.payments || []).reduce((acc, payment) => {
            //                             const key = `${payment.payer_edrpou}_${payment.receipt_edrpou}`;
            //                             if (!acc[key]) {
            //                                 acc[key] = {
            //                                     payer_edrpou: payment.payer_edrpou,
            //                                     payer_name: payment.payer_name,
            //                                     receipt_edrpou: payment.receipt_edrpou,
            //                                     receipt_name: payment.receipt_name,
            //                                     programme_type: point.programme_name,
            //                                     object_type: point.object_type,
            //                                     total_amount: 0
            //                                 };
            //                             }
            //                             acc[key].total_amount += payment.amount;
            //                             return acc;
            //                         }, {});
        
            //                         // Count occurrences of each payer_edrpou
            //                         const payerCounts = {};
            //                         for (const key in aggregatedPayments) {
            //                             const edrpou = aggregatedPayments[key].payer_edrpou;
            //                             if (!payerCounts[edrpou]) {
            //                                 payerCounts[edrpou] = 0;
            //                             }
            //                             payerCounts[edrpou]++;
            //                         }
        
            //                         let tooltipContent = `
            //                             <div class="tooltip-content">
            //                                 <div class="tooltip-section">
            //                                     <table>
            //                                         <tr>
            //                                             <th>District:</th>
            //                                             <td>${point.district_en || ''}</td>
            //                                         </tr>
            //                                         <tr>
            //                                             <th>Hromada:</th>
            //                                             <td>${point.terhromada_en || ''}</td>
            //                                         </tr>
            //                                         <tr>
            //                                             <th>Settlement:</th>
            //                                             <td>${point.settlement_en || ''}</td>
            //                                         </tr>
            //                                         <tr>
            //                                             <th>Address:</th>
            //                                             <td>${point.street ? point.street + ", " + point.building : ''}</td>
            //                                         </tr>
            //                                         <tr>
            //                                             <th>Plan:</th>
            //                                             <td>${point.amount_decision ? point.amount_decision.toLocaleString().replaceAll(',', ' ') + ' UAH' : ''}</td>
            //                                         </tr>
            //                                         <tr>
            //                                             <th>Actual:</th>
            //                                             <td>${point.amount_payments ? point.amount_payments.toLocaleString().replaceAll(',', ' ') + ' UAH' : ''}</td>
            //                                         </tr>
            //                                     </table>
            //                                 </div>
            //                                 <div class="tooltip-section">
            //                                     <table style="border-collapse: collapse; width: 100%;">
            //                                         <tr>
            //                                             <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Payer ID</th>
            //                                             <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Payer name</th>
            //                                             <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Recipient ID</th>
            //                                             <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Recipient name</th>
            //                                             <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Programme</th>
            //                                             <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">Type</th>
            //                                             <th style="border: 1px solid #000; text-align: center; padding: 8px; background-color: #dbdfff ">UAH</th>
            //                                         </tr>
            //                         `;
        
            //                         let currentPayer = null;
            //                         for (const key in aggregatedPayments) {
            //                             const payment = aggregatedPayments[key];
            //                             if (payment.payer_edrpou !== currentPayer) {
            //                                 currentPayer = payment.payer_edrpou;
            //                                 tooltipContent += `
            //                                     <tr>
            //                                         <td rowspan="${payerCounts[payment.payer_edrpou]}" style="border: 1px solid #000; padding: 8px;">${payment.payer_edrpou || ''}</td>
            //                                         <td rowspan="${payerCounts[payment.payer_edrpou]}" style="border: 1px solid #000; padding: 8px;">${payment.payer_name || ''}</td>
            //                                         <td style="border: 1px solid #000; padding: 8px;">${payment.receipt_edrpou || ''}</td>
            //                                         <td style="border: 1px solid #000; padding: 8px;">${payment.receipt_name || ''}</td>
            //                                         <td style="border: 1px solid #000; padding: 8px;">${payment.programme_type || ''}</td>
            //                                         <td style="border: 1px solid #000; padding: 8px;">${payment.object_type || ''}</td>
            //                                         <td style="border: 1px solid #000; padding: 8px; white-space: nowrap;">${payment.total_amount.toLocaleString().replaceAll(',', ' ') || ''}</td>
            //                                     </tr> 
            //                                 `;
            //                             } else {
            //                                 tooltipContent += `
            //                                     <tr>
            //                                         <td style="border: 1px solid #000; padding: 8px;">${payment.receipt_edrpou || ''}</td>
            //                                         <td style="border: 1px solid #000; padding: 8px;">${payment.receipt_name || ''}</td>
            //                                         <td style="border: 1px solid #000; padding: 8px;">${payment.programme_type || ''}</td>
            //                                         <td style="border: 1px solid #000; padding: 8px;">${payment.object_type || ''}</td>
            //                                         <td style="border: 1px solid #000; padding: 8px; white-space: nowrap;">${payment.total_amount.toLocaleString().replaceAll(',', ' ') || ''}</td>
            //                                     </tr>
            //                                 `;
            //                             }
            //                         }
        
            //                         tooltipContent += `
            //                                     </table>
            //                                 </div>
            //                             </div>
            //                         `;
        
            //                         return tooltipContent;
            //                     }
            //                 });

            //                 point.series.chart.tooltip.refresh(point);
            //             },
            //             mouseOut: function () {
            //                 chart.tooltip.update({
            //                     enabled: false
            //                 });
            //             }
            //         }
            //     }
            // }, false);
        
            // chart.mapView.update({
            //     projection: {
            //         name: 'WebMercator'
            //     },
            // }, false);
            // chart.redraw();
            // chart.hideLoading();
            addMappointSeries(chart, seriesName, pointsConverted);
            return;
        }

        let mapKey = `adm-levels/ADM${level+1}/${e.point.drilldown}.geojson`

        chart.showLoading('<i class="icon-spinner icon-spin icon-3x"></i>'); 
        const topology = await fetch(mapKey).then(response => response.json());
        const topoData = Highcharts.geojson(topology);

        levelData[drilldownLevel] = topoData.map(item => ({ ...item }));

        chart.hideLoading(); 

        const seriesName = e.point.properties[`ADM${drilldownLevel}_EN`];
        breadcrumbNames = [seriesName];
        data = await aggregateByPcode(topoData);

        chart.addSeriesAsDrilldown(e.point, {
            name: seriesName,
            data: data,
            dataLabels: {
                enabled: true,
                format: `{point.properties.ADM${drilldownLevel+1}_EN}`
            }
        });
    }
};

const syncFilter = function () {
    const points = pointsFull;
    const objectCategory = document.getElementById('obj-category').value;
    const programType = document.getElementById('program-type').value;
    const payerEdrpou = document.getElementById('payer-edrpou').value;
    const receiptEdrpou = document.getElementById('receipt-edrpou').value;

    const filteredPoints = points.filter(point => {
        const matchesObjectCategory = objectCategory === 'all' || point.object_type === objectCategory;
        const matchesProgramType = programType === 'all' || point.kpk == programType;
        const matchesPayerEdrpou = payerEdrpou === 'all' || point.payer_edrpou == payerEdrpou; 
        const matchesReceiptEdrpou = receiptEdrpou === 'all' || point.receipt_edrpou == receiptEdrpou;
        return matchesObjectCategory &&  matchesProgramType && matchesPayerEdrpou && matchesReceiptEdrpou;
    });
    console.log(`Filtering by ${objectCategory}, ${payerEdrpou}, ${receiptEdrpou} ${programType}`)
    return filteredPoints;
}

const syncAggregate = function (data) {
    const points = syncFilter();
    data.forEach((d) => {
        d.value = 0;
        d.drilldown = d.properties[`ADM${drilldownLevel+1}_PCODE`];
        points.forEach(p => {
            if (d.properties[`ADM${drilldownLevel+1}_PCODE`] === p[`adm${drilldownLevel+1}_pcode`]) {
                d.value += p.amount;
            }
        });
        d.value = d.value === 0 ? 0 : d.value;
    });
    return data;
}

const testFilterByCategories = async function (pcode=null) {
    let points = await fetch(`points.json`).then(response => response.json());

    const objectCategory = document.getElementById('obj-category').value;
    const programType = document.getElementById('program-type').value;
    const payerEdrpou = document.getElementById('payer-edrpou').value;
    const receiptEdrpou = document.getElementById('receipt-edrpou').value;

    if (pcode) {
        //log('Filtering by pcode: ', pcode);
        points = points.filter(point => point[`adm${drilldownLevel}_pcode`] === pcode);
    }

    const filteredPoints = points.reduce((acc, point) => {
        const matchesObjectCategory = objectCategory === 'all' || point.object_type === objectCategory;
        const matchesProgramType = programType === 'all' || point.kpk == programType;

        let filteredPayments = [];
        let amount = 0;

        filteredPayments = point.payments.filter(payment => {
            const matchesPayerEdrpou = payerEdrpou === 'all' || payment.payer_edrpou == payerEdrpou;
            const matchesReceiptEdrpou = receiptEdrpou === 'all' || payment.receipt_edrpou == receiptEdrpou;
            if (matchesPayerEdrpou && matchesReceiptEdrpou) {
                amount += payment.amount;
                return true;
            }
            return false;
        });

        if (matchesObjectCategory && matchesProgramType && amount > 0) {
            const filteredPoint = {...point, payments: filteredPayments, amount: amount};
            acc.push(filteredPoint);
        }

        return acc;
    }, []);

    console.log(`Filtering by ${objectCategory}, ${payerEdrpou}, ${receiptEdrpou}, ${programType}`);
    //log(filteredPoints)
    return filteredPoints;
};


let afterDrillUp = function(e) {console.log('drillup event: ', e)};

(async () => {
    // MAP INITIALIZATION
    const response = await fetch('adm-levels/adm1.json');
    const topology = await response.json();
    data = Highcharts.geojson(topology);
    data = await aggregateByPcode(data);
    Highcharts.mapChart('map-container', {
        custom: {
            customData: data
        },
        chart: {
            events: {
                drilldown,
                redraw: function() {
                    //console.log('redraw')
            },
                drillupall: async function(e) {
                    updateCharts(pcode[`${drilldownLevel === 4 ? 2 : drilldownLevel - 1}`]);
                    drilldownLevel -= 1;
                    breadcrumbNames.pop(); 

                    if (drilldownLevel === 0) {
                        //data = syncAggregate(dataInit);
                        data = await aggregateByPcode(dataInit);
                        this.series[0].remove();
                        this.addSeries(e.point, {
                            name: 'seriesName',
                            data: data,
                            dataLabels: {
                                enabled: true,
                                format: `{point.properties.ADM${drilldownLevel+1}_EN}`
                            }
                        });
                        this.series[0].setData(data, true);
                    }

                    else if (drilldownLevel === 1 || drilldownLevel === 2) {
                        //data = syncAggregate(levelData[drilldownLevel]);
                        data = await aggregateByPcode(levelData[drilldownLevel]);
                        this.series[0].remove();
                        this.addSeries(e.point, {
                            name: 'seriesName',
                            data: data,
                            dataLabels: {
                                enabled: true,
                                format: `{point.properties.ADM${drilldownLevel+1}_EN}`
                            }
                        });
                        this.series[0].setData(data, true);
                    }

                    else {
                        drilldownLevel -= 1;
                        const chart = this;
                        const seriesTypesToRemove = ['tiledwebmap', 'mappoint'];
                            seriesTypesToRemove.forEach(seriesType => {
                                const series = chart.series.find(s => s.type === seriesType);
                                if (series) {
                                    series.remove(false); 
                                }
                            });
                        chart.redraw();
                        //data = syncAggregate(levelData[drilldownLevel]);
                        data = await aggregateByPcode(levelData[drilldownLevel]);
                        this.addSeries(e.point, {
                            name: 'seriesName',
                            data: data,
                            dataLabels: {
                                enabled: true,
                                format: `{point.properties.ADM${drilldownLevel}_EN}`
                            }
                        });
                        this.series[0].setData(data, true);
                        chart.update({legend: {enabled: true}}, false);
                    }
                }
            },
            style: {
                fontFamily: 'Montserrat, sans-serif'  // Apply custom font here
            }
        },

        title: {
            text: ''
        },

        colorAxis: {
            minColor: '#FFFFFF', 
            maxColor: '#00467E', 
            nullColor: '#FFFFFF',
            stops: [
                [0, '#FFFFFF'], 
                [0.0001, '#fff5cc'],
                [0.001, '#ffea99'],
                [0.01, '#ffe580'], 
                [0.1, '#4d7ea5'],
                [0.65, '#6690b2'],
                [0.7, '#336b98'],
                [1, '#003158']
            ],
            labels: {
                formatter: function () {
                    const absValue = Math.abs(this.value);
                    let label;
                    if (absValue >= 1e9) {
                        label = (this.value / 1e9).toFixed() + 'млрд ';
                    } else if (absValue >= 1e6) {
                        label = (this.value / 1e6).toFixed() + 'млн ';
                    } else if (absValue >= 1e3) {
                        label = (this.value / 1e3).toFixed() + 'тис ';
                    } else {
                        label = this.value.toString();
                    }
                    return label;
                }
            }
        },
        mapView: {
            projection: {
                name: 'LambertConformalConic'
            },
            padding: 0
        },

        mapNavigation: {
            enabled: true,
            buttonOptions: {
                verticalAlign: 'bottom'
            }
        },

        tooltip: {
            pointFormatter: function() {
                return mapTooltipFormatter(this.options);
            }
        },

        plotOptions: {
            map: {
                states: {
                    hover: {
                        color: '#EEDD66'
                    }
                }
            }
        },

        legend: {
            enabled: true
        },

        series: [{
            data: data,
            name: 'Ukraine',
            dataLabels: {
                enabled: true,
                format: '{point.properties.ADM1_EN}'
            },
            custom: {
                mapView: {
                    projection: {
                        name: 'LambertConformalConic'
                    },
                    padding: 0
                }
            }
        }],

        drilldown: {
            activeDataLabelStyle: {
                color: '#FFFFFF',
                textDecoration: 'none',
                textOutline: '1px #000000'
            },
            breadcrumbs: {
                floating: true,
                formatter: function () {
                    return breadcrumbNames.join(' / ');
                },
                showFullPath: true 
            },
            drillUpButton: {
                relativeTo: 'spacingBox',
                position: {
                    x: 0,
                    y: 60
                }
            }
        }
    });

    // TREEMAP INITIALIZATION
    const valuesByCategory = getValuesByObjCategory(pointsFull);
    Highcharts.chart('treemap-container', {
    chart: {
        events: {
            redraw: function() {
                //console.log('tmredraw')
            }
        },
        style: {
            fontFamily: 'Montserrat, sans-serif'  // Apply custom font here
        }
    },
    colorAxis: {
        minColor: '#FFFFFF', 
        maxColor: '#00467E', 
        labels: {
            formatter: function() {
                return formatLegendLabel(this.value);
            }
        }
    },
    series: [{
        type: 'treemap',
        layoutAlgorithm: 'squarified',
        clip: false,
        data: valuesByCategory
    }],
    title: {
        text: 'Type',
        align: 'center'
    },
    tooltip: {
        useHTML: true,
        pointFormat: `{point.name}: <b>{point.value}</b> UAH`,
        formatter: function() {
            return `${this.point.name}: <b>${formatLegendLabel(this.point.value, false)} UAH</b>`;
        }
    }
    });

    // LINE CHART INITIALIZATION
    const tsSeries = formatTsData(pointsFull);
    Highcharts.chart('line-chart-container',{
        chart: {
            renderTo: 'container',
            type: 'column',
            zoomType: 'xy',
            style: {
                fontFamily: 'Montserrat, sans-serif'  // Apply custom font here
            }
        },
        xAxis: {
            type: 'datetime',
            tickInterval: 2592000000,
            dateTimeLabelFormats: {
                month: '%b'
            },
            labels: {
                rotation: -90
            }
        },
        yAxis: {
            labels: {
                formatter: function() {
                    return formatLegendLabel(this.value);
                }
            },
            title: {
                enabled: false
            }
        },
        tooltip: {
            valueSuffix: ' UAH',
            xDateFormat: '%b %Y',
            formatter: function() {
                return `<b>${formatLegendLabel(this.y, false)} UAH</b>`;
            }
        },
        colors: ['#ffbd01'],
        title: {
            text: 'Period'
        },
        legend: {
            enabled: false
        },
        series: tsSeries.series,
    })

    // BAR CHARTS INITIALIZATION
    const { series: receiptSeries, categories: receiptCategories } = formatBarData(pointsFull, 'receipt_name');
    const { series: payerSeries, categories: payerCategories } = formatBarData(pointsFull, 'payer_name');
    Highcharts.chart('bar-payer', {
        chart: {
          type: "bar",
          zoomType: "y",
          style: {
            fontFamily: 'Montserrat, sans-serif'  // Apply custom font here
        }
        },
        title: {
          text: "Top payers, UAH"
        },
        xAxis: {
          categories: payerCategories,
          title: {
            text: null
          },
          labels: {
            style: {
                width: '150px', 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }
        }
        },
        yAxis: {
          min: 0,
          title: {
            text: null
          },
          labels: {
            overflow: "justify",
            formatter: function() {
                return formatLegendLabel(this.value);
            }
          }
        },
        tooltip: {
          valueSuffix: " UAH"
        },
        legend: {
          enabled: false
        },
        series: [payerSeries]
      });
    Highcharts.chart('bar-reciept', {
        chart: {
          type: "bar",
          zoomType: "y",
          style: {
            fontFamily: 'Montserrat, sans-serif'  // Apply custom font here
        }
        },
        title: {
          text: "Top recipients, UAH"
        },
        xAxis: {
          categories: receiptCategories,
          title: {
            text: null
          },
          labels: {
            style: {
                width: '150px', 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }
        }
        },
        yAxis: {
          min: 0,
          title: {
            text: null
          },
          labels: {
            overflow: "justify",
            formatter: function() {
                return formatLegendLabel(this.value);
            }
          },
        },
        tooltip: {
          valueSuffix: " UAH"
        },
        legend: {
          enabled: false
        },
        series: [receiptSeries]
      });

    // PROGRAMS TABLE INITIALIZATION
    await updateTable(pointsFull);
    await updateMetrics(pointsFull);

    // EVENT HANDLERS
    const onDropdownChange = async function() {
        if (drilldownLevel !== 4) {
            const chart = Highcharts.charts[0]; 
            let aggregatedData = await aggregateByPcode(data); 
            chart.series[0].setData(aggregatedData);
            updateCharts(pcode[`${drilldownLevel}`]);
        }  else {
            const chart = Highcharts.charts[0]; 
            let points = await getFilteredMappoints();
            updateCharts(pcode[`${drilldownLevel}`]);
            chart.series[1].remove();
            addMappointSeries(chart, 'Mappoints', points);
        }
    }

    $(document).ready(function() {
        $('#obj-category').select2();
        $('#program-type').select2();
        $('#receipt-edrpou').select2();
        $('#payer-edrpou').select2();
        $('#payer-edrpou').on('change', onDropdownChange);
        $('#receipt-edrpou').on('change', onDropdownChange);
        $('#obj-category').on('change', onDropdownChange);
        $('#program-type').on('change', onDropdownChange);

        $('button[data-reset-target]').on('click', async function() {
            const targetId = $(this).data('reset-target');
            console.log('resetting filter for: ', targetId);
            if (drilldownLevel !== 4) {
                resetFilter(targetId);
    
                const chart = Highcharts.charts[0]; 
                let aggregatedData = await aggregateByPcode(data); 
                chart.series[0].setData(aggregatedData);
                updateCharts(pcode[`${drilldownLevel}`]);
            } else {
                resetFilter(targetId);
                const chart = Highcharts.charts[0]; 
                let points = await getFilteredMappoints();
                updateCharts(pcode[`${drilldownLevel}`]);
                chart.series[1].remove();
                addMappointSeries(chart, 'Mappoints', points);
            }   
        });
        $('#reset-all-filters').on('click', async function() {
            console.log('Resetting all filters');
            if (drilldownLevel !== 4) {
                resetAllFilters();
    
                // Update the chart for non-drilldown scenario
                const chart = Highcharts.charts[0]; 
                let aggregatedData = await aggregateByPcode(data); 
                chart.series[0].setData(aggregatedData);
                updateCharts(pcode[`${drilldownLevel}`]);
            } else {
                resetAllFilters();
    
                // Update the chart for drilldown scenario
                const chart = Highcharts.charts[0]; 
                let points = await getFilteredMappoints();
                updateCharts(pcode[`${drilldownLevel}`]);
                chart.series[1].remove();
                addMappointSeries(chart, 'Mappoints', points);
            }
        });
    });
})();