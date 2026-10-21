/** Small story-local inventory helpers. Inventories are plain save-friendly objects. */
export function inventoryCount(inventory, itemId) {
  const count = inventory?.[itemId];
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

export function addItem(inventory, itemId, amount = 1) {
  if (!inventory || typeof inventory !== 'object' || typeof itemId !== 'string' || !itemId) throw new TypeError('An inventory and item id are required.');
  if (!Number.isSafeInteger(amount) || amount < 1) throw new RangeError('Item amount must be a positive integer.');
  inventory[itemId] = inventoryCount(inventory, itemId) + amount;
  return inventory[itemId];
}

export function hasItems(inventory, requirements) {
  return Object.entries(requirements).every(([itemId, amount]) => inventoryCount(inventory, itemId) >= amount);
}
