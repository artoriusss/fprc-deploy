let breadcrumbNames = ['Ukraine']; 

var data;
var drilldownLevel = 0;
var levelData = {};
var pcode = {};

const pointsFull = await fetch('points.json').then(response => response.json());
const response = await fetch('adm-levels/adm1.json');
const topology = await response.json();
const dataa = Highcharts.geojson(topology);
const dataInit = dataa.map(item => ({ ...item }));

// BAR CHART LOGIC
const formatBarData = function (points, aggregateBy) {
    const barColour = aggregateBy === 'payer_name' ? "#00457e" : '#ffbd01';
    const aggregatedData = points.reduce((acc, point) => {
        const key = point[aggregateBy];
        if (acc[key]) {
            acc[key] += point.amount;
        } else {
            acc[key] = point.amount;
        }
        return acc;
    }, {});

    const sortedData = Object.keys(aggregatedData)
        .map(key => ({ name: key, amount: aggregatedData[key] }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10); 

    const seriesData = sortedData.map(item => item.amount);
    const categories = sortedData.map(item => item.name);

    const series = {
        name: "Замовник",
        color: barColour,
        data: seriesData
    };

    return { series, categories };
};

const updateBarChart = async function (pcode) {
    const pts = pcode ? await filterPointsByPcode(pcode) : await filterByCategories();
    const { series: recieptSeries, categories: recieptCategories } = formatBarData(pts, 'recipt_name');
    const { series: payerSeries, categories: payerCategories } = formatBarData(pts, 'payer_name');
    Highcharts.charts[3].series[0].setData(payerSeries.data);
    Highcharts.charts[4].series[0].setData(recieptSeries.data);
    Highcharts.charts[3].axes[0].setCategories(payerCategories);
    Highcharts.charts[4].axes[0].setCategories(recieptCategories);
}

// LINE CHART LOGIC

const formatTsData = function (points) {
    let formattedData = points.reduce((acc, item) => {
        let timestamp = item.trans_date * 1000; 
        let amount = item.amount // / 1e6; 
      
        let existingEntry = acc.find(entry => entry[0] === timestamp);
        if (existingEntry) {
          existingEntry[1] += amount;
        } else {
          acc.push([timestamp, amount]);
        }
        return acc;
      }, []);

      formattedData.sort((a, b) => a[0] - b[0]);
      formattedData = formattedData.filter(([_, amount]) => amount !== 0);
      return formattedData;
}

const updateLineChart = async function (pcode) {
    const pts = pcode ? await filterPointsByPcode(pcode) : await filterByCategories();
    const tsData = formatTsData(pts);
    Highcharts.charts[2].series[0].setData(tsData);
}

// TREEMAP LOGIC

const filterPointsByPcode = async function (pcode) {
    const points = await fetch('points.json').then(response => response.json());
    const objectCategory = document.getElementById('obj-category').value;
    const programType = document.getElementById('program-type').value;
    const payerEdrpou = document.getElementById('payer-edrpou').value;
    const receiptEdrpou = document.getElementById('receipt-edrpou').value;
    
    const fPoints = points.filter(point => point[`adm${drilldownLevel}_pcode`] === pcode);
    const filteredPoints = fPoints.filter(point => {
        const matchesObjectCategory = objectCategory === 'all' || point.object_type === objectCategory;
        const matchesProgramType = programType === 'all' || point.kpk == programType;
        const matchesPayerEdrpou = payerEdrpou === 'all' || point.payer_edrpou == payerEdrpou; 
        const matchesReceiptEdrpou = receiptEdrpou === 'all' || point.recipt_edrpou == receiptEdrpou;
        return matchesObjectCategory &&  matchesProgramType && matchesPayerEdrpou && matchesReceiptEdrpou;
    });
    console.log(`Filtering by ${objectCategory}, ${payerEdrpou}, ${receiptEdrpou} ${programType}`)
    return filteredPoints;
}

const calculateColorValue = (value) => {
    const scaleFactor = 0.1;
    return value * scaleFactor;
};

const getValuesByObjCategory = function(points) {
    const aggregatedByCategory = points.reduce((acc, point) => {
        const { object_type, amount } = point;
        if (!acc[object_type]) {
            acc[object_type] = 0;
        }
        acc[object_type] += amount;
        return acc;
    }, {});

    const categoryValuesArray = Object.keys(aggregatedByCategory).map((key) => ({
        name: key,
        value: aggregatedByCategory[key],
        colorValue: calculateColorValue(aggregatedByCategory[key]) 
    }));

    return categoryValuesArray;
};

const updateTreeMap = async function (pcode) {
    const pts = pcode ? await filterPointsByPcode(pcode) : await filterByCategories();
    const valuesByCategory = getValuesByObjCategory(pts);
    Highcharts.charts[1].series[0].setData(valuesByCategory);
}

// MAP LOGIC

const getFilteredMappoints = async function () {
    let points = await fetch('test_points.json').then(response => response.json());
    points = await filterByCategories();

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
}

const filterByCategories = async function () {
    const points = await fetch('points.json').then(response => response.json());

    const objectCategory = document.getElementById('obj-category').value;
    const programType = document.getElementById('program-type').value;
    const payerEdrpou = document.getElementById('payer-edrpou').value;
    const receiptEdrpou = document.getElementById('receipt-edrpou').value;

    const filteredPoints = points.filter(point => {
        const matchesObjectCategory = objectCategory === 'all' || point.object_type === objectCategory;
        const matchesProgramType = programType === 'all' || point.kpk == programType;
        const matchesPayerEdrpou = payerEdrpou === 'all' || point.payer_edrpou == payerEdrpou; 
        const matchesReceiptEdrpou = receiptEdrpou === 'all' || point.recipt_edrpou == receiptEdrpou;
        return matchesObjectCategory &&  matchesProgramType && matchesPayerEdrpou && matchesReceiptEdrpou;
    });
    console.log(`Filtering by ${objectCategory}, ${payerEdrpou}, ${receiptEdrpou} ${programType}`)
    return filteredPoints;
}

const getDrilldownLevel = function (length) {
    return length > 9 ? 4 : length > 6 ? 3 : length > 4 ? 2 : 1;
}

const aggregateByPcode = async function (data) {
    const points = await filterByCategories(); 
    data.forEach((d) => {
        d.value = 0; 
        d.drilldown = d.properties[`ADM${drilldownLevel+1}_PCODE`];
        points.forEach(p => {
            if (d.properties[`ADM${drilldownLevel+1}_PCODE`] === p[`adm${drilldownLevel+1}_pcode`]) {
                d.value += p.amount;
            }
        });
        d.value = d.value === 0 ? null : d.value;
    });
    return data;
}

const drilldown = async function (e) {
    if (!e.seriesOptions) {
        const chart = this;
        const level = getDrilldownLevel(e.point.drilldown.length);
        drilldownLevel = level;
        pcode[`${level}`] =  e.point.properties[`ADM${drilldownLevel}_PCODE`];
        
        updateTreeMap(pcode[`${level}`]);
        updateLineChart(pcode[`${level}`]);
        updateBarChart(pcode[`${level}`]);

        if (level === 4) {
            const seriesName = e.point.properties[`ADM${drilldownLevel}_UA`];
            breadcrumbNames.push(seriesName);
            chart.update({
                mapView: {
                    projection: {
                        name: 'WebMercator' 
                    }
                }
            }, false);

            let pointsConverted = await getFilteredMappoints();

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
                color: 'rgba(128,128,128,0.3)'
            }, false); 


            chart.addSeries({
                type: 'mappoint',
                name: seriesName,
                enableMouseTracking: false,
                states: {
                    inactive: {
                        enabled: false
                    }
                },
                dataLabels: {
                    enabled: true,
                    format: '{point.options.name}'
                },
                data: pointsConverted
            }, false);

            chart.mapView.update({
                projection: {
                    name: 'WebMercator'
                },
            }, false);
            chart.redraw(); 
            chart.hideLoading();
            return;
        }

        let mapKey = `adm-levels/ADM${level+1}/${e.point.drilldown}.geojson`

        chart.showLoading('<i class="icon-spinner icon-spin icon-3x"></i>'); 
        const topology = await fetch(mapKey).then(response => response.json());
        const topoData = Highcharts.geojson(topology);

        levelData[drilldownLevel] = topoData.map(item => ({ ...item }));

        chart.hideLoading(); 

        const seriesName = e.point.properties[`ADM${drilldownLevel}_UA`];
        breadcrumbNames = [seriesName];
        data = await aggregateByPcode(topoData);

        chart.addSeriesAsDrilldown(e.point, {
            name: seriesName,
            data: data,
            dataLabels: {
                enabled: true,
                format: `{point.properties.ADM${drilldownLevel+1}_UA}`
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
        const matchesReceiptEdrpou = receiptEdrpou === 'all' || point.recipt_edrpou == receiptEdrpou;
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
        d.value = d.value === 0 ? null : d.value;
    });
    return data;
}

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
                drillupall: function(e) {
                    console.log(drilldownLevel);
                    updateTreeMap(pcode[`${drilldownLevel === 4 ? 2 : drilldownLevel - 1}`]);
                    updateLineChart(pcode[`${drilldownLevel === 4 ? 2 : drilldownLevel - 1}`]);
                    updateBarChart(pcode[`${drilldownLevel === 4 ? 2 : drilldownLevel - 1}`]);
                    drilldownLevel -= 1;
                    breadcrumbNames.pop(); 

                    if (drilldownLevel === 0) {
                        data = syncAggregate(dataInit);
                        this.series[0].remove();
                        this.addSeries(e.point, {
                            name: 'seriesName',
                            data: data,
                            dataLabels: {
                                enabled: true,
                                format: `{point.properties.ADM${drilldownLevel+1}_UA}`
                            }
                        });
                        this.series[0].setData(data, true);
                    }

                    else if (drilldownLevel === 1 || drilldownLevel === 2) {
                        data = syncAggregate(levelData[drilldownLevel]);
                        this.series[0].remove();
                        this.addSeries(e.point, {
                            name: 'seriesName',
                            data: data,
                            dataLabels: {
                                enabled: true,
                                format: `{point.properties.ADM${drilldownLevel+1}_UA}`
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
                        data = syncAggregate(levelData[drilldownLevel]);
                        this.addSeries(e.point, {
                            name: 'seriesName',
                            data: data,
                            dataLabels: {
                                enabled: true,
                                format: `{point.properties.ADM${drilldownLevel}_UA}`
                            }
                        });
                        this.series[0].setData(data, true);
                    }
                }
            }
        },

        title: {
            text: 'Видатки на відбудову України'
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
            ]
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

        plotOptions: {
            map: {
                states: {
                    hover: {
                        color: '#EEDD66'
                    }
                }
            }
        },

        series: [{
            data: data,
            name: 'Ukraine',
            dataLabels: {
                enabled: true,
                format: '{point.properties.ADM1_UA}'
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
                console.log('tmredraw')
            }
        },
    },
    colorAxis: {
        minColor: '#FFFFFF', 
        maxColor: '#00467E', 
    },
    series: [{
        type: 'treemap',
        layoutAlgorithm: 'squarified',
        clip: false,
        data: valuesByCategory
    }],
        title: {
            text: 'Тип видатків',
            align: 'left'
        },
        tooltip: {
            useHTML: true,
            pointFormat:
                '{point.name}: <b>{point.value}</b> гривень'
        }
    });

    // LINE CHART INITIALIZATION
    const tsData = formatTsData(pointsFull);
    Highcharts.chart('line-chart-container', {
        chart: {
            zooming: {
                type: 'x'
            }
        },
        title: {
            text: 'Розподіл видаків за періодом',
            align: 'left'
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: {
            title: {
                text: 'Сума'
            }
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            series: {
                color: '#00457e'
            }
        },

        series: [{
            name: 'Видатки: ',
            data: tsData
        }]
    });

    // BAR CHARTS INITIALIZATION
    const { series: recieptSeries, categories: recieptCategories } = formatBarData(pointsFull, 'recipt_name');
    const { series: payerSeries, categories: payerCategories } = formatBarData(pointsFull, 'payer_name');
    Highcharts.chart('bar-payer', {
        chart: {
          type: "bar",
          zoomType: "y"
        },
        title: {
          text: "Найбільші замовники, грн"
        },
        xAxis: {
          categories: payerCategories,
          title: {
            text: null
          },
          labels: {
            style: {
                width: '150px', // Adjust the width as needed
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
          }
        },
        tooltip: {
          valueSuffix: " грн"
        },
        legend: {
          enabled: false
        },
        series: [payerSeries]
      });
    Highcharts.chart('bar-reciept', {
        chart: {
          type: "bar",
          zoomType: "y"
        },
        title: {
          text: "Найбільші отримувачі, грн"
        },
        xAxis: {
          categories: recieptCategories,
          title: {
            text: null
          },
          labels: {
            style: {
                width: '150px', // Adjust the width as needed
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
          }
        },
        tooltip: {
          valueSuffix: " грн"
        },
        legend: {
          enabled: false
        },
        series: [recieptSeries]
      });

    console.log(Highcharts.charts[4])

    // EVENT HANDLERS
    const onDropdownChange = async function() {
        if (drilldownLevel !== 4) {
            const chart = Highcharts.charts[0]; 
            let aggregatedData = await aggregateByPcode(data); 
            chart.series[0].setData(aggregatedData);
            console.log(pcode)
            updateTreeMap(pcode[`${drilldownLevel}`]);
            updateLineChart(pcode[`${drilldownLevel}`]);
            updateBarChart(pcode[`${drilldownLevel}`]);
        }  else {
            const chart = Highcharts.charts[0]; 
            let points = await getFilteredMappoints();

            chart.series[1].remove();

            chart.addSeries({
                type: 'mappoint',
                name: 'Mappoints',
                enableMouseTracking: false,
                states: {
                    inactive: {
                        enabled: false
                    }
                },
                dataLabels: {
                    enabled: true,
                    format: '{point.options.name}'
                },
                data: points
            }, false);

            chart.mapView.update({
                projection: {
                    name: 'WebMercator'
                },
            }, false);
            chart.redraw(); 
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
    });
})();