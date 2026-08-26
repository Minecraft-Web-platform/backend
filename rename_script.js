const fs = require('fs');

const files = [
    'src/states/controllers/territories.controller.ts',
    'src/states/entities/city.entity.ts',
    'src/states/services/territories.service.ts',
    'src/states/states.module.ts',
    'src/states/states.service.ts'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/CityTerritory/g, 'TerritoryEntity');
    content = content.replace(/city-territory\.entity/g, 'territory.entity');
    fs.writeFileSync(file, content);
});

console.log('Renamed in all files');
