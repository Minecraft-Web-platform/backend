const fs = require('fs');
const path = require('path');

const files = [
  "src/economy/economy.module.ts",
  "src/economy/services/economy.service.ts",
  "src/economy/services/companies.service.ts",
  "src/users/entities/user.entity.ts",
  "src/states/states.module.ts",
  "src/states/states.service.ts",
  "src/states/settlements.controller.ts",
  "src/states/services/streets.service.ts",
  "src/states/services/elections.service.ts",
  "src/states/services/settlements.service.ts",
  "src/states/services/territories.service.ts",
  "src/states/entities/state.entity.ts",
  "src/states/entities/territory.entity.ts",
  "src/states/entities/citizenship-request.entity.ts",
  "src/states/entities/street.entity.ts",
  "src/states/entities/settlement.entity.ts"
];

files.forEach(f => {
  const fullPath = path.join(__dirname, f);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/CityEntity/g, 'SettlementEntity');
    content = content.replace(/city\.entity/g, 'settlement.entity');
    content = content.replace(/cities\.service/g, 'settlements.service');
    content = content.replace(/CitiesService/g, 'SettlementsService');
    content = content.replace(/cities\.controller/g, 'settlements.controller');
    content = content.replace(/CitiesController/g, 'SettlementsController');
    fs.writeFileSync(fullPath, content);
  }
});
console.log('Replacements done!');
