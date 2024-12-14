// weconnect-server/models/teamModel.js, parallel to /prisma/schema/team.prisma

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

async function deleteOne (id) {
  await prisma.team.delete({
    where: {
      id,
    },
  });
}

async function saveTeam (team) {
  const updateTeam = await prisma.team.update({
    where: {
      id: team.id,
    },
    data: {
      team,
    },
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
  const team = await prisma.team.create({ data: mergedTeam });
  return team;
}

async function createTeamMember (updateDict) {
  // eslint-disable-next-line prefer-object-spread
  const mergedTeam = Object.assign({}, teamObjTemplate, updateDict);
  const teamMember = await prisma.teamMember.create({ data: mergedTeam });
  return teamMember;
}

module.exports = {
  createTeam,
  createTeamMember,
  deleteOne,
  findOneTeam,
  findTeamById,
  findTeamListByParams,
  removeProtectedFieldsFromTeam,
  saveTeam,
  TEAM_FIELDS_ACCEPTED,
}; // Export the functions
