let breadcrumbNames = ['Ukraine']; 
let prevSeries;

var data
var drilldownLevel = 0;

const pointsFull = await fetch('test_points.json').then(response => response.json());

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
            fillColor: 'rgba(78, 224, 58, 0.95)' 
        }
    }));
    return points;
}


const filterByCategories = async function () {
    const points = await fetch('test_points.json').then(response => response.json());

    const objectCategory = document.getElementById('obj-category').value;
    const settlementType = document.getElementById('settlement-type').value;

    const filteredPoints = points.filter(point => {
        const matchesObjectCategory = objectCategory === 'all' || point.object_type === objectCategory;
        const matchesSettlementType = settlementType === 'all' || point.settlement_type === settlementType;
        return matchesObjectCategory && matchesSettlementType;
    });
    //console.log(`Filtered Points. Object Category: ${objectCategory}, Settlement Type: ${settlementType}`);
    return filteredPoints;
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
        }
    )});
    return data;
}

const getDrilldownLevel = function (length) {
    return length > 9 ? 4 : length > 6 ? 3 : length > 4 ? 2 : 1;
}

const drilldown = async function (e) {
    //console.log(data);
    if (!e.seriesOptions) {
        const chart = this;

        const level = getDrilldownLevel(e.point.drilldown.length);
        drilldownLevel = level;

        if (level === 4) {
            console.log(chart)
            console.log("Drilldown level: ", level);
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
                name: 'Mappoints',
                enableMouseTracking: false,
                states: {
                    inactive: {
                        enabled: false
                    }
                },
                dataLabels: {
                    enabled: true,
                    format: '{point.options.object_type} - {point.options.settlement_type}'
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
        prevSeries = chart.series[0];
        console.log('before: ',prevSeries);
        data = Highcharts.geojson(topology);
        chart.hideLoading(); 

        const seriesName = e.point.properties[`ADM${drilldownLevel}_UA`];
        breadcrumbNames = [seriesName];

        data = await aggregateByPcode(data);

        chart.addSeriesAsDrilldown(e.point, {
            name: seriesName,
            data: data,
            dataLabels: {
                enabled: true,
                format: `{point.properties.ADM${drilldownLevel+1}_UA}`
            }
        });
        console.log('after: ',prevSeries);
    }
};

const syncFilter = function () {
    const points = pointsFull;
    const objectCategory = document.getElementById('obj-category').value;
    const settlementType = document.getElementById('settlement-type').value;

    const filteredPoints = points.filter(point => {
        const matchesObjectCategory = objectCategory === 'all' || point.object_type === objectCategory;
        const matchesSettlementType = settlementType === 'all' || point.settlement_type === settlementType;
        return matchesObjectCategory && matchesSettlementType;
    });
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
    });
    return data;
}

const afterDrillUp = function (e) {
    drilldownLevel -= 1;
    data = syncAggregate(data);
    const chart = this;
    console.log('afterDrillUp: ', drilldownLevel);
    // chart.series[0] = prevSeries;
    
    // setTimeout(function() {
    //     const seriesTypesToRemove = ['tiledwebmap', 'mappoint'];
    //     seriesTypesToRemove.forEach(seriesType => {
    //         const series = chart.series.find(s => s.type === seriesType);
    //         if (series) {
    //             series.remove(false); 
    //         }
    //     });
    //     chart.redraw();
    // }, 0); 

    // if (e.seriesOptions.custom && e.seriesOptions.custom.mapView) {
    //     chart.mapView.update(
    //         Highcharts.merge(
    //             { insets: undefined },
    //             e.seriesOptions.custom.mapView
    //         ),
    //         false 
    //     );
    // }
    // chart.redraw(); 
};

(async () => {
    const response = await fetch('adm-levels/adm1.json');
    const topology = await response.json();
    data = Highcharts.geojson(topology);

    data = await aggregateByPcode(data);

    //console.log(data);

    Highcharts.mapChart('container', {
        custom: {
            customData: data
        },
        chart: {
            events: {
                drilldown,
                afterDrillUp
            }
        },

        title: {
            text: 'Видатки на відбудову України'
        },

        colorAxis: {
            minColor: '#FFFFFF', 
            maxColor: '#00467E', 
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

    document.getElementById('obj-category').addEventListener('change', async (e) => {
        if (drilldownLevel !== 4) {
            const chart = Highcharts.charts[0]; 
            let aggregatedData = await aggregateByPcode(data); 
            chart.series[0].setData(aggregatedData); 
        } 
        else {
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
                    format: '{point.options.object_type} - {point.options.settlement_type}'
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
    });

    document.getElementById('settlement-type').addEventListener('change', async (e) => {
        if (drilldownLevel !== 4) {
            console.log('DRILLDOWN LEVEL: ', drilldownLevel);
            const chart = Highcharts.charts[0]; 
            let aggregatedData = await aggregateByPcode(data); 
            //console.log('SERIES 0', chart.series);
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
                    format: '{point.options.object_type} - {point.options.settlement_type}'
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
    });
})();