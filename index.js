let breadcrumbNames = ['Ukraine']; 

function updateChartByCategory(chart, category) {
    const series = chart.series[0]; // Assuming the first series is the one with the drilldown
    series.points.forEach(point => {
        // Skip points without properties (like separators in breadcrumbs)
        if (!point.properties) {
            return;
        }

        const newVal = category === 'Total'
            ? (point.properties['Total'] === 0 ? 0.0001 : point.properties['Total'])
            : (point[category] === undefined ? 0.0001 : point[category]);

        point.update({ value: newVal }, false); // False to prevent redrawing for each point
    });
    chart.redraw(); // Redraw once after all points are updated
}

const drilldown = async function (e) {
    if (!e.seriesOptions) {
        const chart = this;
        const isSecondLevel = e.point.drilldown.length > 4; 
        const isThirdLevel = e.point.drilldown.length > 6; 
        const isFourthLevel = e.point.drilldown.length > 9;

        if (isFourthLevel) {
            chart.update({
                mapView: {
                    projection: {
                        name: 'WebMercator' 
                    }
                }
            }, false);

            const points = await fetch('points.json').then(response => response.json());
            const convertToFloat = str => parseFloat(str.replace(',', '.'));

            const pointsConverted = points.map(obj => ({
                ...obj,
                lat: convertToFloat(obj.lat),
                lon: convertToFloat(obj.lon)
            }));

            const maxAmount = Math.max(...points.map(p => p.amount)); 
            const minRadius = 5; 
            const maxRadius = 40; 

            const scale_factor = (maxRadius - minRadius) / Math.sqrt(maxAmount);

            const calculateRadius = (amount) => {
                return Math.sqrt(amount) * scale_factor + minRadius;
            };

            const pointsWithRadii = points.map(obj => ({
                ...obj,
                lat: convertToFloat(obj.lat),
                lon: convertToFloat(obj.lon),
                marker: {
                    radius: calculateRadius(obj.amount),
                    fillColor: 'rgba(124, 181, 236, 0.8)' 
                }
            }));

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
                    enabled: true
                },
                data: pointsWithRadii
            }, false);

            chart.redraw(); 
            chart.hideLoading();
            return;
        }

        let mapKey = 'adm-levels/';
        if (isFourthLevel) {
            mapKey += `ADM5/${e.point.drilldown}.geojson`;
        } else if (isThirdLevel) {
            mapKey += `ADM4/${e.point.drilldown}.geojson`;
        } else if (isSecondLevel) {
            mapKey += `ADM3/${e.point.drilldown}.geojson`;
        } else {
            mapKey += `ADM2/${e.point.drilldown}.geojson`;
        }

        chart.showLoading('<i class="icon-spinner icon-spin icon-3x"></i>'); 
        const topology = await fetch(mapKey).then(response => response.json());
        let data = Highcharts.geojson(topology);

        chart.hideLoading(); 

        const seriesName = e.point.properties[`ADM${isFourthLevel ? '4' : isThirdLevel ? '3' : isSecondLevel ? '2' : '1'}_UA`];
        if (isFourthLevel) {
            breadcrumbNames = [seriesName];
        } else if (isThirdLevel) {
            breadcrumbNames = [seriesName];
        } else if (isSecondLevel) {
            breadcrumbNames = [seriesName];
        } else {
            breadcrumbNames = [seriesName];
        }

        data.forEach((d, i) => {
            d.value = i; 
            d.drilldown = d.properties[isThirdLevel ? 'ADM4_PCODE' : isSecondLevel ? 'ADM3_PCODE' : 'ADM2_PCODE'];
            d.value = d.properties['Total'];
            d.a = d.properties['Транспорт'],
            d.b = d.properties['Освіта'],
            d.c = d.properties['Медицина'],
            d.d = d.properties['Житло'],
            d.e = d.properties['Адміністративні'],
            d.f = d.properties['Інше']
        });

        chart.addSeriesAsDrilldown(e.point, {
            name: seriesName,
            data: data,
            dataLabels: {
                enabled: true,
                format: `{point.properties.${isThirdLevel ? 'ADM4_UA' : isSecondLevel ? 'ADM3_UA' : 'ADM2_UA'}}`
            }
        });

    }
};

const afterDrillUp = function (e) {
    const chart = e.target;
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

    if (e.seriesOptions.custom && e.seriesOptions.custom.mapView) {
        chart.mapView.update(
            Highcharts.merge(
                { insets: undefined },
                e.seriesOptions.custom.mapView
            ),
            false 
        );
    }
};

(async () => {
    const response = await fetch('adm-levels/adm1_merged.geojson');
    const topology = await response.json();
    const data = Highcharts.geojson(topology);

    data.forEach((d, i) => {
        d.drilldown = d.properties.ADM1_PCODE;
        d.value = d.properties['Total'];
        d.a = d.properties['Транспорт'],
        d.b = d.properties['Освіта'],
        d.c = d.properties['Медицина'],
        d.d = d.properties['Житло'],
        d.e = d.properties['Адміністративні'],
        d.f = d.properties['Інше']
    });

    console.log(data);

    Highcharts.mapChart('container', {
        chart: {
            events: {
                drilldown,
                afterDrillUp,
                load() {
                    const chart = this; // Reference to the chart instance
                    
                    // Select the dropdown element
                    const selectElement = document.getElementById('obj-category');
    
                    // Update chart when the dropdown changes
                    selectElement.addEventListener('change', function () {
                        const selectedCategory = this.value;
                        updateChartByCategory(chart, selectedCategory);
                    });
    
                    // Update the chart based on the current selection on initial load
                    const selectedCategory = selectElement.value;
                    if (selectedCategory !== 'Total') { // Assuming 'Total' is the default selection
                        updateChartByCategory(chart, selectedCategory);
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
            data,
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
})();