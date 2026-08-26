
const fs = require("fs");
let c = fs.readFileSync("src/services/inventory.service.js", "utf8");

const additions = `
exports.deleteStationeryCatalogItem = async (itemName) => {
  try {
    await prisma.inventoryItem.deleteMany({
      where: { name: itemName, category: { in: ["stationery", "printing"] } }
    });
    return await exports.getStationeryCatalog();
  } catch(e) {
    console.error("Failed to delete stationery catalog item:", e);
    return null;
  }
};
`;

c = c + "\\n" + additions;
fs.writeFileSync("src/services/inventory.service.js", c);
console.log("Done");

