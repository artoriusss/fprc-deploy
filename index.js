let breadcrumbNames = ['Ukraine']; 

const drilldown = async function (e) {
    if (!e.seriesOptions) {
        const chart = this;
        const isSecondLevel = e.point.drilldown.length > 4; 
        const isThirdLevel = e.point.drilldown.length > 6; 
        const isFourthLevel = e.point.drilldown.length > 9;

        if (isFourthLevel) {
            // Add the web map as a tiledwebmap series
            const points = await fetch('points.json').then(response => response.json());
            const convertToFloat = str => parseFloat(str.replace(',', '.'));
        
            const pointsConverted = points.map(obj => ({
                ...obj,
                lat: convertToFloat(obj.lat),
                lon: convertToFloat(obj.lon)
            }));
        
            console.log(pointsConverted.slice(0, 5));
            
            // First add the tiledwebmap series
            chart.addSeriesAsDrilldown(e.point, {
                type: 'tiledwebmap',
                name: 'TWM Tiles',
                provider: {
                    type: 'OpenStreetMap',
                    theme: 'Standard'
                },
                color: 'rgba(128,128,128,0.3)'
            });
            
            // Then add the mappoint series separately
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
                data: pointsConverted
            });
        
            chart.hideLoading();
            return;
        }

        let mapKey = 'adm-levels/';
        if (isFourthLevel) {
            mapKey += `ua-adm5/${e.point.drilldown}.geojson`;
        } else if (isThirdLevel) {
            mapKey += `ua-adm4/${e.point.drilldown}.geojson`;
        } else if (isSecondLevel) {
            mapKey += `ua-adm3/${e.point.drilldown}.geojson`;
        } else {
            mapKey += `ua-adm1/${e.point.drilldown}.geojson`;
        }

        chart.showLoading('<i class="icon-spinner icon-spin icon-3x"></i>'); // Show loading icon
        const topology = await fetch(mapKey).then(response => response.json());
        let data = Highcharts.geojson(topology);

        chart.hideLoading(); // Hide loading icon

        const seriesName = e.point.properties[`ADM${isFourthLevel ? '4' : isThirdLevel ? '3' : isSecondLevel ? '2' : '1'}_EN`];
        if (isFourthLevel) {
            breadcrumbNames = [seriesName];
        } else if (isThirdLevel) {
            breadcrumbNames = [seriesName];
        } else if (isSecondLevel) {
            breadcrumbNames = [seriesName];
        } else {
            breadcrumbNames = [seriesName];
        }

        // Modify properties for areas
        data.forEach((d, i) => {
            d.value = i; // or any other value logic for your points
            d.drilldown = d.properties[isThirdLevel ? 'ADM4_PCODE' : isSecondLevel ? 'ADM3_PCODE' : 'ADM2_PCODE'];
            d.value = d.properties['amount'] === 0 ? 0.0001 : d.properties['amount'];
        });

        chart.addSeriesAsDrilldown(e.point, {
            name: seriesName,
            data: data,
            dataLabels: {
                enabled: true,
                format: `{point.properties.${isThirdLevel ? 'ADM4_EN' : isSecondLevel ? 'ADM3_EN' : 'ADM2_EN'}}`
            }
        });

    }
};


// On drill up, reset to the top-level map view
const afterDrillUp = function (e) {
    if (e.seriesOptions.custom && e.seriesOptions.custom.mapView) {
        e.target.mapView.update(
            Highcharts.merge(
                { insets: undefined },
                e.seriesOptions.custom.mapView
            ),
            false
        );
    }
    breadcrumbNames.pop();
};

(async () => {
    // Fetch the top-level .geojson data for Ukraine
    const response = await fetch('adm-levels/adm1-initial.geojson');
    const topology = await response.json();

    const data = Highcharts.geojson(topology);

    // Set drilldown keys and bogus data for demonstration
    data.forEach((d, i) => {
        d.drilldown = d.properties.ADM1_PCODE;
        d.value = d.properties['amount'] == 0 ? 0.0001 : d.properties['amount'];
    });


    // Instantiate the Highcharts map
    Highcharts.mapChart('container', {
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
            data,
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
                //format: `Level: {this.series}`, // Use the name of the point for breadcrumbs
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