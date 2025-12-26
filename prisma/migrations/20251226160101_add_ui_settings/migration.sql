-- CreateTable
CREATE TABLE "UiSettings" (
    "id" TEXT NOT NULL,
    "sectionTitleSize" INTEGER NOT NULL DEFAULT 22,
    "categoryTitleSize" INTEGER NOT NULL DEFAULT 18,
    "itemNameSize" INTEGER NOT NULL DEFAULT 16,
    "itemDescriptionSize" INTEGER NOT NULL DEFAULT 14,
    "itemPriceSize" INTEGER NOT NULL DEFAULT 16,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UiSettings_pkey" PRIMARY KEY ("id")
);
