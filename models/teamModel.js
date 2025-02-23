// weconnect-server/models/teamModel.js, parallel to /prisma/schema/team.prisma

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEAM_ACCESS_RIGHTS_OPTIONS = [
  'canAddTeamMemberThisTeam',
  'canEditPersonThisTeam', 'canEditTeamThisTeam',
  'canRemoveTeamMemberThisTeam',
];

const TEAM_FIELDS_ACCEPTED = [
  'description',
  'meetingDay',
  'meetingTime',
  'statusActive',
  'teamName',
];

async function findTeamById (id) {
  const team = await prisma.team.findUnique({
    where: {
      id,
    },
  });
  return team;
}

async function findTeamMemberListByParams (params = {}) {
  const teamList = await prisma.teamMember.findMany({
    where: params,
  });
  return teamList;
}

function removeProtectedFieldsFromTeam (team) {
  const modifiedTeam = { ...team };
  // delete modifiedTeam.passwordResetExpires;
  return modifiedTeam;
}

async function findTeamListByParams (params = {}, includeAllData = false) {
  const teamList = await prisma.team.findMany({
    where: params,
  });
  let modifiedTeam = {};
  let modifiedTeamList = [];
  if (includeAllData) {
    modifiedTeamList = teamList;
  } else {
    teamList.forEach((team) => {
      modifiedTeam = removeProtectedFieldsFromTeam(team);
      modifiedTeam.teamId = team.id;
      modifiedTeamList.push(modifiedTeam);
    });
  }
  return modifiedTeamList;
}

async function findOneTeam (params) {   // Find one with array
  const team = await prisma.team.findUnique({
    where: params,
  });
  return team;
}

// async function deleteOne (id) {
//   await prisma.team.delete({
//     where: {
//       id,
//     },
//   });
// }

async function deleteOneTeamMember (personId, teamId) {
  await prisma.teamMember.delete({
    where: {
      teamMemberId: {
        personId,
        teamId,
      },
    },
  });
}

async function saveTeam (team) {
  const updateTeam = await prisma.team.update({
    where: {
      id: team.id,
    },
    data: team,
  });
  console.log(updateTeam);
}

// For required fields that we want to include, even if not passed from the interface.
const teamObjTemplate = {
  // teamName: '',
};

async function createTeam (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const mergedTeam = Object.assign({}, teamObjTemplate, updateDict);
  return prisma.team.create({ data: mergedTeam });
}

async function deleteTeam (teamId) {
  const teamMembers = await findTeamMemberListByParams({ teamId });
  console.log(`removing ${teamMembers.length} from team ${teamId})`);
  teamMembers.forEach((member) => {
    console.log(`-- removing ${member.lastName} from team ${teamId})`);
    deleteOneTeamMember(member.personId, teamId);
  });
  console.log(`removing ${teamMembers.length} from team ${teamId})`);

  return prisma.team.delete({
    where: {
      id: teamId,
    },
  });
}

async function createTeamMember (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const mergedTeam = Object.assign({}, teamObjTemplate, updateDict);
  return prisma.teamMember.create({ data: mergedTeam });
}

function updateOrCreateTeamMember (personId, teamId, updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const createDict = Object.assign({}, { personId, teamId }, updateDict);
  try {
    const upResult =  prisma.teamMember.upsert({
      where: {
        teamMemberId: {
          personId,
          teamId,
        },
      },
      update: { ...updateDict },
      create: { ...createDict },
    });
    return upResult;
  } catch (err) {
    console.log('updateOrCreateTeamMember: ERROR ', err);
    return null;
  }
}

// These are the permissions this signed in person can perform on data like: people or team records
const getTeamAccessRightsForPerson = async (person) => {
  const teamsAccessRightsDict = {}; // key: teamId, value: accessRightsDict
  if (!person || !person.id) {
    console.error('Undefined person in getTeamAccessRightsForPerson');
    return teamsAccessRightsDict;
  }
  // Retrieve all teams where this person has TeamMember.isTeamAdmin and TeamMember.statusIsActiveInTeam
  const teamMemberList = await prisma.teamMember.findMany({
    where: {
      isTeamAdmin: true,
      personId: person.id,
      statusIsActiveInTeam: true,
    },
  });
  // console.log('getTeamAccessRightsForPerson teamMemberList:', teamMemberList);
  for (let teamIndex = 0; teamIndex < teamMemberList.length; teamIndex++) {
    const accessRightsDict = {};
    const teamMember = teamMemberList[teamIndex];
    // console.log('getTeamAccessRightsForPerson teamMember:', teamMember);
    // Add all ACCESS_RIGHTS_OPTIONS to the accessRightsDict with false values
    for (let i = 0; i < TEAM_ACCESS_RIGHTS_OPTIONS.length; i++) {
      accessRightsDict[TEAM_ACCESS_RIGHTS_OPTIONS[i]] = false;
    }
    // If teamMember is a team admin, set all access rights to true
    if (teamMember.isTeamAdmin && teamMember.statusIsActiveInTeam) {
      for (let i = 0; i < TEAM_ACCESS_RIGHTS_OPTIONS.length; i++) {
        accessRightsDict[TEAM_ACCESS_RIGHTS_OPTIONS[i]] = true;
      }
    }
    // console.log('getTeamAccessRightsForPerson accessRightsDict:', accessRightsDict);
    teamsAccessRightsDict[teamMember.teamId] = accessRightsDict;
  }
  // console.log('getTeamAccessRightsForPerson teamsAccessRightsDict:', teamsAccessRightsDict);
  return teamsAccessRightsDict;
};

// We assemble a dictionary so we can see who is active in each team
const getPersonIdsByTeamDict = async () => {
  const personIdsByTeamId = {}; // key: teamId, value: list of personIds active in that team
  // Retrieve all teams where this person has TeamMember.isTeamAdmin and TeamMember.statusIsActiveInTeam
  const teamMemberList = await prisma.teamMember.findMany({
    where: {
      statusIsActiveInTeam: true,
    },
  });
  // console.log('getTeamAccessRightsForPerson teamMemberList:', teamMemberList);
  for (let teamIndex = 0; teamIndex < teamMemberList.length; teamIndex++) {
    const teamMember = teamMemberList[teamIndex];
    if (!(teamMember.teamId in personIdsByTeamId)) {
      personIdsByTeamId[teamMember.teamId] = [];
    }
    if (!(teamMember.personId in personIdsByTeamId[teamMember.teamId])) {
      personIdsByTeamId[teamMember.teamId].push(teamMember.personId);
    }
  }
  // console.log('getPersonIdsByTeamDict personIdsByTeamId:', personIdsByTeamId);
  return personIdsByTeamId;
};

module.exports = {
  createTeam,
  createTeamMember,
  deleteOneTeamMember,
  deleteTeam,
  findOneTeam,
  findTeamById,
  findTeamListByParams,
  findTeamMemberListByParams,
  getPersonIdsByTeamDict,
  getTeamAccessRightsForPerson,
  removeProtectedFieldsFromTeam,
  saveTeam,
  TEAM_FIELDS_ACCEPTED,
  updateOrCreateTeamMember,
}; // Export the functions
