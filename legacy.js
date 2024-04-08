const filterByCategories = async function () {
    objectCategory = document.getElementById('obj-category').value;
    settlementType = document.getElementById('settlement-type').value;
    //console.log('filterByCategories. objType: ', objType, 'settlementType: ', settlementType);
    const points = await fetch('test_points.json').then(response => response.json());
    if (objectCategory === 'all' && settlementType === 'all') {
        console.log('objectCategory === all && settlementType === all');
        return points;
    } else if (objectCategory === 'all') {
        console.log('objectCategory === all');
        return points.filter(p => p.settlement_type === settlementType);
    } else if (settlementType === 'all') {
        console.log('settlementType === all');
        return points.filter(p => p.object_type === objectCategory);
    } else {
        console.log('else');
        return points.filter(p => p.object_type === objectCategory && p.settlement_type === settlementType);
    }
}

const filterPoints = async function (selectedCategory) {
    console.log('filterPoints. selectedCategory: ',selectedCategory);
    const points = await fetch('test_points.json').then(response => response.json());
    if (selectedCategory && selectedCategory !== 'all') {
        const filteredPoints = points.filter(p => p.object_type === selectedCategory);
        //console.log(filteredPoints.length);
        return points.filter(p => p.object_type === selectedCategory); // Return the filtered array
    } else {
        return points;
    }
};