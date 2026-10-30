import { addSyntheticInventory } from "../demo/syntheticInventory.js";
import { InventoryItem } from "../models/InventoryItem.js";

export async function createInvestigatorDemoData(request, response) {
  const ownerId = request.auth.userId;
  if (await InventoryItem.exists({ ownerId })) {
    return response.status(409).json({
      message: "Demo data can only be added to an account with no inventory items.",
    });
  }

  try {
    const added = await addSyntheticInventory(ownerId);
    return response.status(201).json({
      message: "Synthetic demo inventory was added. It is not real retailer data.",
      itemsCreated: added.items,
      transactionsCreated: added.transactions,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({
        message: "Demo data has already been added to this account.",
      });
    }
    throw error;
  }
}
