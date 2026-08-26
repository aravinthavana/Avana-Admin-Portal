
const fs = require("fs");
let c = fs.readFileSync("src/controllers/inventory.controller.js", "utf8");

const additions = `
exports.deleteStationeryItemType = async (req, res, next) => {
  try {
    const itemName = req.params.itemName;
    if (!itemName) return res.status(400).json({ error: "Missing item name." });
    
    // Remove from catalog
    await inventoryService.deleteStationeryCatalogItem(itemName);
    
    // Remove from stock
    const stock = await inventoryService.getStock("stationery");
    if (stock.hasOwnProperty(itemName)) {
      delete stock[itemName];
      await inventoryService.saveStock("stationery", stock);
    }
    
    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) { next(error); }
};

exports.deleteHousekeepingItemType = async (req, res, next) => {
  try {
    const itemName = req.params.itemName;
    if (!itemName) return res.status(400).json({ error: "Missing item name." });
    
    const stock = await inventoryService.getStock("housekeeping");
    if (stock.hasOwnProperty(itemName)) {
      delete stock[itemName];
      await inventoryService.saveStock("housekeeping", stock);
    }
    
    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) { next(error); }
};
`;

c = c + "\\n" + additions;
fs.writeFileSync("src/controllers/inventory.controller.js", c);
console.log("Done");

