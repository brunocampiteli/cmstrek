-- CreateTable
CREATE TABLE "_AdBlockExclusions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_AdBlockExclusions_AB_unique" ON "_AdBlockExclusions"("A", "B");

-- CreateIndex
CREATE INDEX "_AdBlockExclusions_B_index" ON "_AdBlockExclusions"("B");

-- AddForeignKey
ALTER TABLE "_AdBlockExclusions" ADD CONSTRAINT "_AdBlockExclusions_A_fkey" FOREIGN KEY ("A") REFERENCES "AdBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdBlockExclusions" ADD CONSTRAINT "_AdBlockExclusions_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
