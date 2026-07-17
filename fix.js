const fs = require('fs');
const path = require('path');

const dir = 'd:\\Clients\\Capstone1Revisions\\AgroData\\src\\pages';
const files = ['Crops.tsx', 'Farmers.tsx', 'Farms.tsx', 'Plots.tsx', 'Harvest.tsx', 'Planting.tsx', 'Users.tsx'];

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\) :\s*\(\s*<Table>/g, ') : (\n          <>\n            <Table>');
  fs.writeFileSync(filePath, content);
});
console.log('Fixed fragment starts');
