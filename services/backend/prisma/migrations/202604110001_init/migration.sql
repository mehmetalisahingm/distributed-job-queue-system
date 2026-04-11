-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM (
  'pending',
  'queued',
  'processing',
  'completed',
  'failed',
  'retrying',
  'dead_lettered'
);

-- CreateEnum
CREATE TYPE "JobType" AS ENUM (
  'email_simulation',
  'image_processing_simulation',
  'report_generation'
);

-- CreateEnum
CREATE TYPE "JobLogLevel" AS ENUM ('info', 'warn', 'error');

-- CreateTable
CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "type" "JobType" NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "JobStatus" NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "delayMs" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL,
  "result" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "bullJobId" TEXT,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLog" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "level" "JobLogLevel" NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_bullJobId_key" ON "Job"("bullJobId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_type_idx" ON "Job"("type");

-- CreateIndex
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "JobLog_jobId_createdAt_idx" ON "JobLog"("jobId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "JobLog"
ADD CONSTRAINT "JobLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
