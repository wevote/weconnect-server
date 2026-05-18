-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "taskType" TEXT;

-- CreateTable
CREATE TABLE "TaskType" (
    "id" SERIAL NOT NULL,
    "taskTypeName" TEXT NOT NULL,
    "taskTypeDescription" TEXT,
    "statusActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TaskType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskType_taskTypeName_key" ON "TaskType"("taskTypeName");
