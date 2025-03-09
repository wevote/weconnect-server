// weconnect-server/models/meetingModel.js, parallel to /prisma/schema/meeting.prisma

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MEETING_FIELDS_ACCEPTED = {
  childOfRecurringMondayDate: 'DATE',
  dayOfTheWeek: 'STRING',
  meetingDescription: 'STRING',
  meetingName: 'STRING',
  meetingDate: 'DATE',
  meetingEndTime: 'DATE',
  meetingStartTime: 'DATE',
  meetingId: 'INTEGER',
  meetingLocked: 'BOOLEAN',
  meetingTimeZone: 'STRING',
  recurringMeetingId: 'INTEGER',
  teamId: 'INTEGER',
};

const RECURRING_MEETING_FIELDS_ACCEPTED = {
  childOfRecurringMondayDate: 'DATE',
  dayOfTheWeek: 'STRING',
  meetingDescription: 'STRING',
  meetingName: 'STRING',
  meetingDate: 'DATE',
  meetingEndTime: 'DATE',
  meetingSequenceEndDate: 'DATE',
  meetingSequenceStartDate: 'DATE',
  meetingStartTime: 'DATE',
  meetingId: 'INTEGER',
  meetingLocked: 'BOOLEAN',
  meetingSequencePaused: 'BOOLEAN',
  meetingTimeZone: 'STRING',
  recurringMeetingId: 'INTEGER',
  teamId: 'INTEGER',
};

async function deleteOneMeetingAttendee (personId, meetingId) {
  await prisma.meetingAttendee.delete({
    where: {
      meetingAttendeeId: {
        personId,
        meetingId,
      },
    },
  });
}

async function findMeetingListByParams (params = {}, includeAllData = false) {
  const meetingList = await prisma.meeting.findMany({
    where: params,
  });
  let modifiedMeeting = {};
  let modifiedMeetingList = [];
  if (includeAllData) {
    modifiedMeetingList = meetingList;
  } else {
    meetingList.forEach((meeting) => {
      // modifiedMeeting = removeProtectedFieldsFromMeeting(meeting);
      modifiedMeeting = meeting;
      modifiedMeeting.meetingId = meeting.id;
      modifiedMeetingList.push(modifiedMeeting);
    });
  }
  return modifiedMeetingList;
}

async function findOneMeeting (params) {   // Find one with array
  const meeting = await prisma.meeting.findUnique({
    where: params,
  });
  const modifiedMeeting = { ...meeting };
  modifiedMeeting.meetingId = meeting.id;
  return modifiedMeeting;
}

async function findOneRecurringMeeting (params) {   // Find one with array
  const recurringMeeting = await prisma.recurringMeeting.findUnique({
    where: params,
  });
  const modifiedRecurringMeeting = { ...recurringMeeting };
  modifiedRecurringMeeting.meetingId = meeting.id;
  return modifiedRecurringMeeting;
}

async function findMeetingAttendeeListByParams (params = {}) {
  const meetingAttendeeList = await prisma.meetingAttendee.findMany({
    where: params,
  });
  return meetingAttendeeList;
}

async function saveMeeting (meeting) {
  const updateMeeting = await prisma.meeting.update({
    where: {
      id: meeting.id,
    },
    data: meeting,
  });
  console.log(updateMeeting);
}

async function saveRecurringMeeting (meeting) {
  const updateMeeting = await prisma.recurringMeeting.update({
    where: {
      id: meeting.id,
    },
    data: meeting,
  });
  console.log(updateMeeting);
}

async function createMeeting (updateDict) {
  return prisma.meeting.create({ data: updateDict });
}

async function createRecurringMeeting (updateDict) {
  return prisma.recurringMeeting.create({ data: updateDict });
}

async function deleteMeeting (meetingId) {
  const meetingAttendees = await findMeetingAttendeeListByParams({ meetingId });
  console.log(`removing ${meetingAttendees.length} from meeting ${meetingId})`);
  meetingAttendees.forEach((member) => {
    console.log(`-- removing ${member.lastName} from meeting ${meetingId})`);
    deleteOneMeetingAttendee(member.personId, meetingId);
  });
  console.log(`removing ${meetingAttendees.length} from meeting ${meetingId})`);

  return prisma.meeting.delete({
    where: {
      id: meetingId,
    },
  });
}

async function createMeetingAttendee (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const mergedTeam = Object.assign({}, teamObjTemplate, updateDict);
  return prisma.teamMember.create({ data: mergedTeam });
}

function updateOrCreateMeetingAttendee (personId, teamId, updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const createDict = Object.assign({}, { personId, teamId }, updateDict);
  try {
    const upResult =  prisma.meetingAttendee.upsert({
      where: {
        meetingAttendeeId: {
          personId,
          teamId,
        },
      },
      update: { ...updateDict },
      create: { ...createDict },
    });
    return upResult;
  } catch (err) {
    console.log('updateOrCreateMeetingAttendee: ERROR ', err);
    return null;
  }
}

module.exports = {
  createMeeting,
  createMeetingAttendee,
  createRecurringMeeting,
  deleteOneMeetingAttendee,
  deleteMeeting,
  findMeetingListByParams,
  findMeetingAttendeeListByParams,
  findOneMeeting,
  findOneRecurringMeeting,
  MEETING_FIELDS_ACCEPTED,
  RECURRING_MEETING_FIELDS_ACCEPTED,
  saveMeeting,
  saveRecurringMeeting,
}; // Export the functions
