/*
  Warnings:

  - The values [MULTIPLE_CHOICE,TEXT] on the enum `AnswerType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AnswerType_new" AS ENUM ('BOOLEAN', 'DATE', 'INTEGER', 'STRING');
ALTER TABLE "QuestionAnswer" ALTER COLUMN "answerType" DROP DEFAULT;
ALTER TABLE "QuestionnaireQuestion" ALTER COLUMN "answerType" DROP DEFAULT;
ALTER TABLE "QuestionnaireQuestionFormer" ALTER COLUMN "answerType" DROP DEFAULT;
ALTER TABLE "QuestionnaireQuestion" ALTER COLUMN "answerType" TYPE "AnswerType_new" USING ("answerType"::text::"AnswerType_new");
ALTER TABLE "QuestionnaireQuestionFormer" ALTER COLUMN "answerType" TYPE "AnswerType_new" USING ("answerType"::text::"AnswerType_new");
ALTER TABLE "QuestionAnswer" ALTER COLUMN "answerType" TYPE "AnswerType_new" USING ("answerType"::text::"AnswerType_new");
ALTER TYPE "AnswerType" RENAME TO "AnswerType_old";
ALTER TYPE "AnswerType_new" RENAME TO "AnswerType";
DROP TYPE "AnswerType_old";
ALTER TABLE "QuestionAnswer" ALTER COLUMN "answerType" SET DEFAULT 'STRING';
ALTER TABLE "QuestionnaireQuestion" ALTER COLUMN "answerType" SET DEFAULT 'STRING';
ALTER TABLE "QuestionnaireQuestionFormer" ALTER COLUMN "answerType" SET DEFAULT 'STRING';
COMMIT;

-- AlterTable
ALTER TABLE "QuestionAnswer" ADD COLUMN     "answerDateTime" TIMESTAMP(3);
