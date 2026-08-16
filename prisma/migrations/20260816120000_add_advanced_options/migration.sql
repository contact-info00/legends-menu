-- Advanced Options: configurable option groups/options and generic item levels.
-- Existing items remain unchanged (zero related rows).

CREATE TABLE IF NOT EXISTS "AdvancedOptionGroup" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "nameKu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "selectionMode" TEXT NOT NULL DEFAULT 'single',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvancedOptionGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdvancedOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "nameKu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "priceAdjustment" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvancedOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ItemLevel" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "nameKu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemLevel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdvancedOptionGroup_itemId_idx" ON "AdvancedOptionGroup"("itemId");
CREATE INDEX IF NOT EXISTS "AdvancedOptionGroup_restaurantId_idx" ON "AdvancedOptionGroup"("restaurantId");
CREATE INDEX IF NOT EXISTS "AdvancedOptionGroup_itemId_isActive_sortOrder_idx" ON "AdvancedOptionGroup"("itemId", "isActive", "sortOrder");

CREATE INDEX IF NOT EXISTS "AdvancedOption_groupId_idx" ON "AdvancedOption"("groupId");
CREATE INDEX IF NOT EXISTS "AdvancedOption_restaurantId_idx" ON "AdvancedOption"("restaurantId");
CREATE INDEX IF NOT EXISTS "AdvancedOption_groupId_isActive_sortOrder_idx" ON "AdvancedOption"("groupId", "isActive", "sortOrder");

CREATE INDEX IF NOT EXISTS "ItemLevel_itemId_idx" ON "ItemLevel"("itemId");
CREATE INDEX IF NOT EXISTS "ItemLevel_restaurantId_idx" ON "ItemLevel"("restaurantId");
CREATE INDEX IF NOT EXISTS "ItemLevel_itemId_isActive_sortOrder_idx" ON "ItemLevel"("itemId", "isActive", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdvancedOptionGroup_itemId_fkey'
  ) THEN
    ALTER TABLE "AdvancedOptionGroup"
      ADD CONSTRAINT "AdvancedOptionGroup_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdvancedOptionGroup_restaurantId_fkey'
  ) THEN
    ALTER TABLE "AdvancedOptionGroup"
      ADD CONSTRAINT "AdvancedOptionGroup_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdvancedOption_groupId_fkey'
  ) THEN
    ALTER TABLE "AdvancedOption"
      ADD CONSTRAINT "AdvancedOption_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "AdvancedOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdvancedOption_restaurantId_fkey'
  ) THEN
    ALTER TABLE "AdvancedOption"
      ADD CONSTRAINT "AdvancedOption_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ItemLevel_itemId_fkey'
  ) THEN
    ALTER TABLE "ItemLevel"
      ADD CONSTRAINT "ItemLevel_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ItemLevel_restaurantId_fkey'
  ) THEN
    ALTER TABLE "ItemLevel"
      ADD CONSTRAINT "ItemLevel_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
