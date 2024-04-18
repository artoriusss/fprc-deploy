let breadcrumbNames = ['Ukraine']; 

var data;
var drilldownLevel = 0;
var levelData = {};

const pointsFull = await fetch('points.json').then(response => response.json());

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
    //console.log(`Filtering by ${objectCategory}, ${payerEdrpou}, ${receiptEdrpou} ${programType}`)
    return filteredPoints;
}

const aggregateByPcode = async function (data) {
    const points = await filterByCategories(); 
    data.forEach((d) => {
        d.value = 0; // Initialize the value
        d.drilldown = d.properties[`ADM${drilldownLevel+1}_PCODE`];
        points.forEach(p => {
            if (d.properties[`ADM${drilldownLevel+1}_PCODE`] === p[`adm${drilldownLevel+1}_pcode`]) {
                d.value += p.amount;
            }
        });
        // Set the value to null if it is 0 after aggregation
        d.value = d.value === 0 ? null : d.value;
    });
    return data;
}

const getDrilldownLevel = function (length) {
    return length > 9 ? 4 : length > 6 ? 3 : length > 4 ? 2 : 1;
}

const drilldown = async function (e) {
    if (!e.seriesOptions) {
        const chart = this;

        const level = getDrilldownLevel(e.point.drilldown.length);
        drilldownLevel = level;
        console.log('drilled to level: ', drilldownLevel);

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
        console.log(`added level ${drilldownLevel} Data: `, levelData);

        chart.hideLoading(); 

        const seriesName = e.point.properties[`ADM${drilldownLevel}_UA`];
        breadcrumbNames = [seriesName];
        data = syncAggregate(topoData);

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

const response = await fetch('adm-levels/adm1.json');
const topology = await response.json();
const dataa = Highcharts.geojson(topology);
const dataInit = dataa.map(item => ({ ...item }));

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
    console.log('sync aggregate data: ', data);
    return data;
}

const syncGetFilteredMappoints = function() {
    let points = syncFilter();

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
            fillColor: 'rgba(78, 224, 58, 0.95)' 
        }
    }));
    return points;
}

const updateMapData = function(chart) {
    const aggregatedData = syncAggregate(data);
    chart.series[0].setData(aggregatedData, false); 

    if (drilldownLevel === 4) {
        let points = syncGetFilteredMappoints();
        
        while (chart.series.length > 1) {
            chart.series[1].remove(false); 
        }

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
    }

    if (drilldownLevel !== 4) {
        while (chart.series.length > 1) {
            chart.series[1].remove(false); 
        }
    }

    chart.redraw(); 
}

const afterDrillUp = function(e) {
    drilldownLevel -= 1;
    breadcrumbNames.pop(); 
    const chart = this;

    if (drilldownLevel === 0) {
        data = syncAggregate(dataInit);
        chart.series[0].setData(data, true);
        duRedraw = true;
        chart.redraw();
        duRedraw = false;
    } 
    else if (drilldownLevel === 3) {
        data = syncAggregate(JSON.parse(JSON.stringify(levelData[drilldownLevel])));
        setTimeout(function() {
            const seriesTypesToRemove = ['tiledwebmap', 'mappoint'];
            seriesTypesToRemove.forEach(seriesType => {
                const series = chart.series.find(s => s.type === seriesType);
                if (series) {
                    series.remove(false); 
                }
            });
            chart.redraw();
        }, 0); 
    } 
    else {
        data = syncAggregate(dataPrev);
        chart.series[0].setData(data); 
    }
};

(async () => {
    const response = await fetch('adm-levels/adm1.json');
    const topology = await response.json();
    data = Highcharts.geojson(topology);
    data = syncAggregate(data);

    Highcharts.mapChart('container', {
        custom: {
            customData: data
        },
        chart: {
            events: {
                drilldown,
                redraw: function() {console.log('redraw')},
                drillupall: function(e) {
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

    const onDropdownChange = async function() {
        if (drilldownLevel !== 4) {
            const chart = Highcharts.charts[0]; 
            let aggregatedData = await aggregateByPcode(data); 
            chart.series[0].setData(aggregatedData);
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