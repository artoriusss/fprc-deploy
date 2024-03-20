let breadcrumbNames = ['Ukraine'];

const drilldown = async function (e) {
    //console.log('Drilling down into:', e.point.properties);
    if (!e.seriesOptions) {
        const chart = this;

        const isSecondLevel = e.point.drilldown.length > 4; 
        const isThirdLevel = e.point.drilldown.length > 6; 

        let mapKey = 'adm-levels/';
        if (isThirdLevel) {
            mapKey += `ua-adm4/${e.point.drilldown}.geojson`;
        } else if (isSecondLevel) {
            mapKey += `ua-adm3/${e.point.drilldown}.geojson`;
        } else {
            mapKey += `ua-adm1/${e.point.drilldown}.geojson`;
        }


        chart.showLoading('<i class="icon-spinner icon-spin icon-3x"></i>');

        const topology = await fetch(mapKey).then(response => response.json());
        const data = Highcharts.geojson(topology);

        data.forEach((d, i) => {
            d.value = i;
            if (isThirdLevel) {
                d.value = d.properties['amount'] === 0 ? 0.0001 : d.properties['amount'];
            } else if (isSecondLevel) {
                d.drilldown = d.properties['ADM3_PCODE']; 
                d.value = d.properties['amount'] === 0 ? 0.0001 : d.properties['amount'];
            } else {
                d.drilldown = d.properties['ADM2_PCODE']; 
                d.value = d.properties['amount'] === 0 ? 0.0001 : d.properties['amount'];
            }
        });

        chart.hideLoading();

        // Set the series name based on the drilldown level and the clicked point information
        const seriesName = isThirdLevel
            ? e.point.properties['ADM3_EN'] 
            : isSecondLevel
            ? e.point.properties['ADM2_EN'] 
            : e.point.properties['ADM1_EN']; 
        console.log('Series name:', seriesName);


        if (isThirdLevel) {
            breadcrumbNames = [seriesName];
        } else if (isSecondLevel) {
            breadcrumbNames = [seriesName];
        } else {
            breadcrumbNames = [seriesName];
        }

        console.log('Breadcrumb names:', breadcrumbNames);
        // Add or update the series for the drilldown
        chart.addSeriesAsDrilldown(e.point, {
            name: e.point.name, //e.point.properties['ADM1_EN'],
            data,
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
            type: 'logarithmic',
            allownegativeLog: false,
            min: 0.0001,
            minColor: '#f7fcb9', 
            maxColor: '#31a354', 
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