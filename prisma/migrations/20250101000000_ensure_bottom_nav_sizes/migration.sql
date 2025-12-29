-- Add bottomNavSectionSize and bottomNavCategorySize columns if they don't exist
DO $$
BEGIN
    -- Add bottomNavCategorySize if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'UiSettings' 
        AND column_name = 'bottomNavCategorySize'
    ) THEN
        ALTER TABLE "UiSettings" ADD COLUMN "bottomNavCategorySize" INTEGER NOT NULL DEFAULT 15;
    END IF;

    -- Add bottomNavSectionSize if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'UiSettings' 
        AND column_name = 'bottomNavSectionSize'
    ) THEN
        ALTER TABLE "UiSettings" ADD COLUMN "bottomNavSectionSize" INTEGER NOT NULL DEFAULT 18;
    END IF;
END $$;

