const fs = require("fs");
let code = fs.readFileSync("frontend/src/pages/HelpDeskAdminPage.jsx", "utf8");

const stationeryRegex = /<Route path="stationery-stock" element=\{\s*<StockManager[\s\S]*?deleteItem=\{stationeryApi\.deleteItem\}\s*\/>\s*\} \/>/;
code = code.replace(stationeryRegex, `<Route path="stationery-stock" element={<StationeryPrintingStockWrapper />} />`);

fs.writeFileSync("frontend/src/pages/HelpDeskAdminPage.jsx", code);
console.log("Done");
