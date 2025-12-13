/*
  Warnings:

  - A unique constraint covering the columns `[postNumber]` on the table `Post` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "postNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Post_postNumber_key" ON "Post"("postNumber");
