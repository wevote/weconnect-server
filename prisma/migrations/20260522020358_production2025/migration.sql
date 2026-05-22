-- CreateTable
CREATE TABLE "ProfileChangeLog" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "changedById" INTEGER NOT NULL,
    "changeDescription" TEXT NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamName" TEXT,

    CONSTRAINT "ProfileChangeLog_pkey" PRIMARY KEY ("id")
);
