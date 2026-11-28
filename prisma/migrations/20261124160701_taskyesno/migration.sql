-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "statusNo" BOOLEAN,
ADD COLUMN     "statusYes" BOOLEAN;

-- AlterTable
ALTER TABLE "TaskDefinition" ADD COLUMN     "isYesNoTask" BOOLEAN;
