// weconnect-server/controllers/teamControllers.js
const { findPersonListByIdList } = require('../models/personModel');
const { findTeamMemberListByParams } = require('../models/teamModel');

exports.retrieveTeamMemberList = async (teamId) => {
  let status = '';
  let success = true;
  let teamMemberList = [];

  /// Retrieve the ids of the team
  // const teamMemberListPromise = findTeamMemberListByParams({ teamId });
  const teamMemberListTemp = await findTeamMemberListByParams({ teamId });
  // console.log('Team member list 1:', teamMemberListTemp);

  const teamMemberPersonIdList = teamMemberListTemp.map((member) => member.personId);
  // console.log('teamMemberPersonIdList:', teamMemberPersonIdList);
  status += `TEAM_MEMBERS_FOUND: ${teamMemberPersonIdList.length} `;

  // Retrieve the team members
  teamMemberList = await findPersonListByIdList(teamMemberPersonIdList);
  // console.log('Team member list 2:', teamMemberList);

  success = true;
  if (teamMemberList) {
    // TODO augment with team membership details
    status += 'TEAM_MEMBERS_FOUND ';
  } else {
    status += 'TEAM_MEMBERS_NOT_FOUND ';
  }
  return {
    teamMemberList,
    success,
    status,
  };
};
