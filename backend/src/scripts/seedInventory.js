import mongoose from "mongoose";
import { env } from "../config/env.js";
import { addSyntheticInventory, removeSyntheticInventory } from "../demo/syntheticInventory.js";
import { User } from "../models/User.js";

async function seed() {
  const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
  if (!email)
    throw new Error(
      "Set SEED_USER_EMAIL to an existing verified account email.",
    );

  await mongoose.connect(env.MONGODB_URI, { appName: "inventra-seed" });
  const user = await User.findOne({ email });
  if (!user)
    throw new Error(`No account exists for ${email}. Sign up before seeding.`);
  if (!user.emailVerified)
    throw new Error(`Account ${email} must verify its email before seeding.`);

  await removeSyntheticInventory(user._id);
  const added = await addSyntheticInventory(user._id);
  console.info(
    `Saved synthetic demo data to MongoDB for ${email}: ${added.warehouses} warehouses, ${added.locations} locations, ${added.items} inventory items, and ${added.transactions} transactions.`,
  );
}

seed()
  .catch((error) => {
    console.error("Inventory seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
