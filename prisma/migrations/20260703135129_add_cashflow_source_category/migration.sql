-- CreateEnum
CREATE TYPE "CashType" AS ENUM ('Income', 'Expense');

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sourceName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "categoryName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secondary_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "categoryName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secondary_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT,
    "primaryCategoryId" TEXT,
    "title" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashType" "CashType" NOT NULL DEFAULT 'Expense',
    "amountOfMoney" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow_secondary_categories" (
    "id" TEXT NOT NULL,
    "cashFlowId" TEXT NOT NULL,
    "secondaryCategoryId" TEXT NOT NULL,

    CONSTRAINT "cash_flow_secondary_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_flows_userId_datetime_idx" ON "cash_flows"("userId", "datetime");

-- CreateIndex
CREATE INDEX "cash_flows_userId_primaryCategoryId_idx" ON "cash_flows"("userId", "primaryCategoryId");

-- CreateIndex
CREATE INDEX "cash_flows_userId_sourceId_idx" ON "cash_flows"("userId", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_flow_secondary_categories_cashFlowId_secondaryCategory_key" ON "cash_flow_secondary_categories"("cashFlowId", "secondaryCategoryId");

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secondary_categories" ADD CONSTRAINT "secondary_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flows" ADD CONSTRAINT "cash_flows_primaryCategoryId_fkey" FOREIGN KEY ("primaryCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_secondary_categories" ADD CONSTRAINT "cash_flow_secondary_categories_cashFlowId_fkey" FOREIGN KEY ("cashFlowId") REFERENCES "cash_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_flow_secondary_categories" ADD CONSTRAINT "cash_flow_secondary_categories_secondaryCategoryId_fkey" FOREIGN KEY ("secondaryCategoryId") REFERENCES "secondary_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
