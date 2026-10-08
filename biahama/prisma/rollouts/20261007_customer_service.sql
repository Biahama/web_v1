-- Additive rollout. Apply before deploying this branch; do not backfill delivery dates from order update times.
BEGIN;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "items" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "customerMessage" TEXT,
    "internalNotes" TEXT,
    "resolutionReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_orderId_key" ON "ReturnRequest"("orderId");

-- CreateIndex
CREATE INDEX "ReturnRequest_status_createdAt_idx" ON "ReturnRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReturnRequest_userId_idx" ON "ReturnRequest"("userId");

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- This application uses server-side Prisma; browser database roles must not access service requests.
ALTER TABLE "ReturnRequest" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ReturnRequest" FROM anon, authenticated;

-- Normalize any legacy duplicate defaults before enforcing the invariant.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY "userId" ORDER BY "isDefault" DESC, "createdAt" DESC, id) AS rank
  FROM "Address"
)
UPDATE "Address" AS address SET "isDefault" = (ranked.rank = 1)
FROM ranked WHERE address.id = ranked.id;
CREATE UNIQUE INDEX "Address_one_default_per_user" ON "Address" ("userId") WHERE "isDefault" = true;

ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_kind_check" CHECK (kind IN ('return', 'exchange'));
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_status_check" CHECK (status IN ('requested', 'approved', 'received', 'resolved', 'rejected'));
COMMIT;
