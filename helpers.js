export const getFilteredMappoints = async function () {
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

export const filterByCategories = async function () {
    const points = await fetch('points.json').then(response => response.json());

    const objectCategory = document.getElementById('obj-category').value;
    const settlementType = document.getElementById('settlement-type').value;
    const programType = document.getElementById('program-type').value;

    const filteredPoints = points.filter(point => {
        const matchesObjectCategory = objectCategory === 'all' || point.object_type === objectCategory;
        const matchesSettlementType = settlementType === 'all' || point.settlement_type === settlementType;
        const matchesProgramType = programType === 'all' || point.kpk == programType;
        return matchesObjectCategory && matchesSettlementType && matchesProgramType;
    });
    return filteredPoints;
}

export const aggregateByPcode = async function (data) {
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



export const syncFilter = function () {
    const points = pointsFull;
    const objectCategory = document.getElementById('obj-category').value;
    const settlementType = document.getElementById('settlement-type').value;
    const programType = document.getElementById('program-type').value;

    const filteredPoints = points.filter(point => {
        const matchesObjectCategory = objectCategory === 'all' || point.object_type === objectCategory;
        const matchesSettlementType = settlementType === 'all' || point.settlement_type === settlementType;
        const matchesProgramType = programType === 'all' || point.kpk == programType;
        return matchesObjectCategory && matchesSettlementType && matchesProgramType;
    });
    return filteredPoints;
}

export const syncAggregate = function (data) {
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

export const syncGetFilteredMappoints = function() {
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

export const updateMapData = function(chart) {
    const aggregatedData = syncAggregate(data);
    chart.series[0].setData(aggregatedData, false); // Redraw set to false to optimize performance

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
                format: '{point.options.object_type} - {point.options.settlement_type}'
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