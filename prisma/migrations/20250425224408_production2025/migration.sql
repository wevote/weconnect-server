-- CreateEnum
CREATE TYPE "DayOfTheWeek" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "MeetingFrequency" AS ENUM ('WEEKLY', 'EVERY_OTHER_WEEK', 'MONTHLY');

-- CreateEnum
CREATE TYPE "TimeZones" AS ENUM ('CENTRAL_TIMEZONE', 'EASTERN_TIMEZONE', 'MOUNTAIN_TIMEZONE', 'PACIFIC_TIMEZONE');

-- CreateEnum
CREATE TYPE "AnswerType" AS ENUM ('BOOLEAN', 'INTEGER', 'MULTIPLE_CHOICE', 'STRING', 'TEXT');

-- CreateTable
CREATE TABLE "ClientSession" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "sessionID" TEXT NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateExpires" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT NOT NULL,

    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" SERIAL NOT NULL,
    "childOfRecurringMondayDate" TIMESTAMP(3),
    "createdByPersonId" INTEGER,
    "dayOfTheWeek" "DayOfTheWeek" NOT NULL DEFAULT 'MONDAY',
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "meetingDescription" TEXT,
    "meetingLocked" BOOLEAN NOT NULL DEFAULT false,
    "meetingName" TEXT,
    "meetingEndTime" TIMESTAMP(3),
    "meetingStartTime" TIMESTAMP(3),
    "meetingTimeZone" "TimeZones" NOT NULL DEFAULT 'PACIFIC_TIMEZONE',
    "recurringMeetingId" INTEGER,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringMeeting" (
    "id" SERIAL NOT NULL,
    "createdByPersonId" INTEGER,
    "dayOfTheWeek" "DayOfTheWeek" NOT NULL DEFAULT 'MONDAY',
    "meetingDescription" TEXT,
    "meetingName" TEXT,
    "meetingSequenceEndDate" TIMESTAMP(3),
    "meetingSequencePaused" BOOLEAN NOT NULL DEFAULT false,
    "meetingSequenceStartDate" TIMESTAMP(3),
    "meetingEndTime" TIMESTAMP(3),
    "meetingStartTime" TIMESTAMP(3),
    "meetingTimeZone" "TimeZones" NOT NULL DEFAULT 'PACIFIC_TIMEZONE',
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "RecurringMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAttendee" (
    "awayDescription" TEXT,
    "awayDescriptionForTeamLeads" TEXT,
    "dateSubmitted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "didAttend" BOOLEAN,
    "didNotAttend" BOOLEAN,
    "meetingId" INTEGER NOT NULL,
    "personFullName" TEXT,
    "personId" INTEGER NOT NULL,
    "reportedByPersonId" INTEGER,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("meetingId","personId")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "birthdayMonthAndDay" TEXT,
    "emailOfficial" TEXT,
    "emailOfficialAlternate" TEXT,
    "emailOfficialVerified" BOOLEAN,
    "emailPersonal" TEXT NOT NULL,
    "emailPersonalOkToShare" BOOLEAN,
    "emailPersonalAlternate" TEXT,
    "emailPreferred" TEXT,
    "firstName" TEXT NOT NULL,
    "firstNamePreferred" TEXT,
    "gender" TEXT,
    "hoursPerWeekEstimate" INTEGER,
    "hoursVolunteered" INTEGER,
    "howLongAtOrg" INTEGER,
    "jobTitle" TEXT,
    "lastName" TEXT,
    "location" TEXT,
    "phoneNumber" TEXT,
    "staffKind" TEXT,
    "stateCode" TEXT,
    "uploadedImageUrlLarge" TEXT,
    "uploadedImageUrlSmall" TEXT,
    "zipCode" TEXT,
    "password" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "emailVerified" BOOLEAN,
    "bluesky" TEXT,
    "facebookUrl" TEXT,
    "githubUrl" TEXT,
    "jazzHrUrl" TEXT,
    "linkedInUrl" TEXT,
    "portfolioUrl" TEXT,
    "snapchat" TEXT,
    "twitch" TEXT,
    "twitterHandle" TEXT,
    "websiteUrl" TEXT,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEmailCreated" TIMESTAMP(3),
    "dateEndDate" TIMESTAMP(3),
    "dateLastActive" TIMESTAMP(3),
    "dateLastOnLeave" TIMESTAMP(3),
    "dateLastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastResigned" TIMESTAMP(3),
    "dateOfferLetterCreated" TIMESTAMP(3),
    "dateOfferLetterSigned" TIMESTAMP(3),
    "dateStartDate" TIMESTAMP(3),
    "isAdmin" BOOLEAN,
    "isHRAdmin" BOOLEAN,
    "isHROfferAdmin" BOOLEAN,
    "isHRGeneralist1" BOOLEAN,
    "isHRGeneralist2" BOOLEAN,
    "isHiringManager" BOOLEAN,
    "isIntern" BOOLEAN,
    "isTeamLead" BOOLEAN,
    "statusActive" BOOLEAN,
    "statusAvailableForSpecialProjects" BOOLEAN,
    "statusEmailCreated" BOOLEAN,
    "statusActiveInLast90Days" BOOLEAN,
    "statusNonresponsive" BOOLEAN,
    "statusOfferLetterCreated" BOOLEAN,
    "statusOfferLetterSigned" BOOLEAN,
    "statusOfferDecisionNeeded" BOOLEAN NOT NULL DEFAULT false,
    "statusOfferQuestionnaireAnswered" BOOLEAN,
    "statusOfferQuestionnaireSent" BOOLEAN,
    "statusOfferApproved" BOOLEAN,
    "statusOfferWillNotBeMade" BOOLEAN,
    "statusOnLeave" BOOLEAN,
    "statusResigned" BOOLEAN,
    "importNote" TEXT,
    "nonAuthoritativeImport" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonAway" (
    "id" SERIAL NOT NULL,
    "awayDescription" TEXT,
    "awayDescriptionForTeamLeads" TEXT,
    "dateEndDate" TIMESTAMP(3),
    "dateEndDateEstimated" TIMESTAMP(3),
    "dateStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateSubmitted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personId" INTEGER NOT NULL,
    "reportedByPersonId" INTEGER,
    "isLeaveOfAbsence" BOOLEAN,
    "isNotFeelingWell" BOOLEAN,
    "isNonResponsive" BOOLEAN,
    "isNotAttending" BOOLEAN,
    "isResigned" BOOLEAN,
    "isVacation" BOOLEAN,
    "isWorkTrip" BOOLEAN,

    CONSTRAINT "PersonAway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questionnaire" (
    "id" SERIAL NOT NULL,
    "questionnaireInstructions" TEXT,
    "questionnaireName" TEXT NOT NULL,
    "questionnaireTitle" TEXT,
    "statusActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireQuestion" (
    "id" SERIAL NOT NULL,
    "answerType" "AnswerType" NOT NULL DEFAULT 'STRING',
    "fieldMappingRule" TEXT,
    "questionInstructions" TEXT,
    "questionOrder" INTEGER NOT NULL DEFAULT 0,
    "questionPlaceholder" TEXT,
    "questionText" TEXT NOT NULL,
    "questionVersion" INTEGER NOT NULL DEFAULT 0,
    "questionnaireId" INTEGER NOT NULL,
    "requireAnswer" BOOLEAN NOT NULL DEFAULT false,
    "statusActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireQuestionFormer" (
    "id" SERIAL NOT NULL,
    "answerType" "AnswerType" NOT NULL DEFAULT 'STRING',
    "fieldMappingRule" TEXT,
    "questionInstructions" TEXT,
    "questionOrder" INTEGER NOT NULL DEFAULT 0,
    "questionText" TEXT NOT NULL,
    "questionVersion" INTEGER NOT NULL DEFAULT 0,
    "questionnaireId" INTEGER NOT NULL,
    "questionnaireQuestionId" INTEGER NOT NULL,
    "requireAnswer" BOOLEAN NOT NULL DEFAULT false,
    "statusActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "QuestionnaireQuestionFormer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAnswer" (
    "answerBoolean" BOOLEAN,
    "answerInteger" INTEGER,
    "answerString" TEXT,
    "answerType" "AnswerType" NOT NULL DEFAULT 'STRING',
    "personId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "questionnaireId" INTEGER NOT NULL,
    "questionVersion" INTEGER NOT NULL DEFAULT 0,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateSubmitted" TIMESTAMP(3),

    CONSTRAINT "QuestionAnswer_pkey" PRIMARY KEY ("questionId","personId")
);

-- CreateTable
CREATE TABLE "Task" (
    "dateLastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneByPersonId" INTEGER,
    "googleDriveSuccess" BOOLEAN,
    "personId" INTEGER NOT NULL,
    "statusDone" BOOLEAN NOT NULL DEFAULT false,
    "statusError" BOOLEAN,
    "statusErrorResolved" BOOLEAN,
    "statusReadyToDo" BOOLEAN NOT NULL DEFAULT false,
    "statusResolvedComment" TEXT,
    "statusToDoByHuman" BOOLEAN,
    "taskDefinitionId" INTEGER NOT NULL,
    "taskGroupId" INTEGER,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("taskDefinitionId","personId")
);

-- CreateTable
CREATE TABLE "TaskChangeLog" (
    "id" SERIAL NOT NULL,
    "changeDescription" TEXT NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneByPersonId" INTEGER,
    "personId" INTEGER NOT NULL,
    "taskGroupId" INTEGER NOT NULL,
    "taskDefinitionId" INTEGER NOT NULL,
    "taskDefinitionIdPersonId" TEXT NOT NULL,
    "statusDone" BOOLEAN,
    "statusToDo" BOOLEAN,

    CONSTRAINT "TaskChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskDefinition" (
    "id" SERIAL NOT NULL,
    "emailTemplateId" INTEGER,
    "googleDriveAssetId" TEXT,
    "isForVolunteer" BOOLEAN NOT NULL DEFAULT false,
    "isGoogleDrivePermissionTask" BOOLEAN,
    "isQuestionnaireTask" BOOLEAN,
    "order" INTEGER NOT NULL DEFAULT 0,
    "questionnaireId" INTEGER NOT NULL DEFAULT -1,
    "statusActive" BOOLEAN NOT NULL DEFAULT true,
    "taskGroupId" INTEGER NOT NULL,
    "taskActionUrl" TEXT,
    "taskName" TEXT NOT NULL,
    "taskNameCompleted" TEXT,
    "taskWhatToDo" TEXT,
    "taskWhyWeDoIt" TEXT,

    CONSTRAINT "TaskDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" SERIAL NOT NULL,
    "isBlockedBy" BOOLEAN NOT NULL DEFAULT false,
    "dependencyName" TEXT,
    "previousTaskDefinitionId" INTEGER NOT NULL,
    "taskDefinitionId" INTEGER NOT NULL,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGroup" (
    "id" SERIAL NOT NULL,
    "assignIfEmailCreated" BOOLEAN,
    "assignIfOfferDecisionNeeded" BOOLEAN,
    "assignIfOfferLetterCreated" BOOLEAN,
    "assignIfOfferLetterSigned" BOOLEAN,
    "assignIfOfferQuestionnaireAnswered" BOOLEAN,
    "assignIfOfferQuestionnaireSent" BOOLEAN,
    "assignIfQuestionnaireAnswered" BOOLEAN,
    "assignIfStatusOfferApproved" BOOLEAN,
    "questionnaireId" INTEGER NOT NULL DEFAULT -1,
    "statusActive" BOOLEAN NOT NULL DEFAULT true,
    "taskGroupName" TEXT NOT NULL,
    "taskGroupDescription" TEXT,
    "taskGroupIsForTeam" BOOLEAN,
    "taskGroupTeamId" INTEGER NOT NULL DEFAULT -1,

    CONSTRAINT "TaskGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskGroupTeamLink" (
    "taskGroupId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL DEFAULT -1,

    CONSTRAINT "TaskGroupTeamLink_pkey" PRIMARY KEY ("taskGroupId","teamId")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "teamName" TEXT NOT NULL,
    "description" TEXT,
    "meetingDay" TEXT,
    "meetingTime" TEXT,
    "statusActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamChangeLog" (
    "id" SERIAL NOT NULL,
    "changeDescription" TEXT NOT NULL,
    "doneByPersonId" INTEGER,
    "personId" INTEGER,
    "teamId" INTEGER NOT NULL,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusDone" BOOLEAN,
    "statusToDo" BOOLEAN,

    CONSTRAINT "TeamChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamGroup" (
    "id" SERIAL NOT NULL,
    "teamGroupName" TEXT NOT NULL,
    "description" TEXT,
    "statusActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TeamGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "personId" INTEGER NOT NULL,
    "teamName" TEXT,
    "isTeamAdmin" BOOLEAN,
    "isTeamLead" BOOLEAN,
    "statusIsActiveInTeam" BOOLEAN NOT NULL DEFAULT true,
    "statusIsOnboardingBasic" BOOLEAN,
    "statusIsOnboardingAdvanced" BOOLEAN,
    "statusIsListening" BOOLEAN,
    "statusOfferLetterSigned" BOOLEAN,
    "dateStartDate" TIMESTAMP(3),
    "dateEndDate" TIMESTAMP(3),
    "dateEndDatePlanned" TIMESTAMP(3),
    "teamId" INTEGER NOT NULL,
    "teamMemberFirstName" TEXT,
    "teamMemberLastName" TEXT,
    "dateCreated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("personId","teamId")
);

-- CreateTable
CREATE TABLE "TeamMemberAway" (
    "id" SERIAL NOT NULL,
    "awayDescription" TEXT,
    "awayDescriptionForTeamLeads" TEXT,
    "dateEndDate" TIMESTAMP(3),
    "dateEndDateEstimated" TIMESTAMP(3),
    "dateStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateSubmitted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "personId" INTEGER NOT NULL,
    "reportedByPersonId" INTEGER,
    "teamId" INTEGER NOT NULL,
    "isLeaveOfAbsence" BOOLEAN,
    "isNotFeelingWell" BOOLEAN,
    "isNonResponsive" BOOLEAN,
    "isNotAttending" BOOLEAN,
    "isResigned" BOOLEAN,
    "isVacation" BOOLEAN,
    "isWorkTrip" BOOLEAN,

    CONSTRAINT "TeamMemberAway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMemberFormer" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "teamName" TEXT,
    "dateStartDate" TIMESTAMP(3),
    "dateEndDate" TIMESTAMP(3),
    "teamId" INTEGER NOT NULL,
    "teamMemberFirstName" TEXT,
    "teamMemberLastName" TEXT,

    CONSTRAINT "TeamMemberFormer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRole" (
    "id" SERIAL NOT NULL,
    "teamRoleName" TEXT NOT NULL,

    CONSTRAINT "TeamRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamRoleToPersonLink" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "teamRoleId" INTEGER NOT NULL,
    "teamRoleName" TEXT,
    "statusIsActiveInTeam" BOOLEAN NOT NULL DEFAULT true,
    "dateStartDate" TIMESTAMP(3),
    "dateEndDate" TIMESTAMP(3),

    CONSTRAINT "TeamRoleToPersonLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamToTeamRoleLink" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "teamRoleId" INTEGER NOT NULL,
    "teamRoleName" TEXT,
    "statusIsActiveInTeam" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TeamToTeamRoleLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "picture" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email2" TEXT,
    "password" TEXT NOT NULL,
    "passwordResetToken" TEXT NOT NULL,
    "passwordResetExpires" TIMESTAMP(3) NOT NULL,
    "emailVerificationToken" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "snapchat" TEXT NOT NULL,
    "facebook" TEXT NOT NULL,
    "twitter" TEXT NOT NULL,
    "google" TEXT NOT NULL,
    "github" TEXT NOT NULL,
    "linkedin" TEXT NOT NULL,
    "steam" TEXT NOT NULL,
    "twitch" TEXT NOT NULL,
    "quickbooks" TEXT NOT NULL,
    "tokens" JSONB NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientSession_sessionID_key" ON "ClientSession"("sessionID");

-- CreateIndex
CREATE UNIQUE INDEX "Person_emailPersonal_key" ON "Person"("emailPersonal");

-- CreateIndex
CREATE UNIQUE INDEX "Team_teamName_key" ON "Team"("teamName");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "session"("expire");

-- AddForeignKey
ALTER TABLE "QuestionnaireQuestion" ADD CONSTRAINT "QuestionnaireQuestion_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuestionnaireQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
