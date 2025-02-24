// weconnect-server/controllers/teamController.js
const { findPersonListByIdList } = require('../models/personModel');
const { findTeamMemberListByParams } = require('../models/teamModel');

// Parallel to weconnect-client viewerCanSeeOrDoForThisTeam
async function viewerCanSeeOrDoForThisTeam (accessRightName, teamId, teamAccessRights) {
  // console.log('viewerCanSeeOrDoForThisTeam Checking access right for teamId:', teamId, ', accessRightName:', accessRightName, ', teamAccessRights: ', teamAccessRights);
  if (teamAccessRights && (teamId in teamAccessRights) && teamAccessRights[teamId] && teamAccessRights[teamId][accessRightName]) {
    return teamAccessRights[teamId][accessRightName];
  } else {
    console.error('Undefined team or access right in viewerCanSeeOrDoForThisTeam, teamId: ', teamId, ', accessRightName: ', accessRightName, ', teamAccessRights: ', teamAccessRights);
    return false;
  }
}

// Parallel to weconnect-client viewerCanSeeOrDoForThisTeamMember
async function viewerCanSeeOrDoForThisTeamMember (accessRightName, personId, teamAccessRights, personIdsByTeam) {
  // console.log('viewerCanSeeOrDoForThisTeamMember Checking access right for personId:', personId, ', accessRightName:', accessRightName, ', personIdsByTeam: ', personIdsByTeam);
  for (let i = 0; i < Object.entries(personIdsByTeam).length; i++) {
    const [teamId, teamMembers] = Object.entries(personIdsByTeam)[i];
    // Loop team-by-team until we find a team where personId is a member.
    if (teamMembers.includes(personId)) {
      // The viewer's rights (by team) are in teamAccessRights.
      // Check each team to see if the viewer has the right to do accessRightName.
      if (teamAccessRights[teamId] && teamAccessRights[teamId][accessRightName]) {
        if (teamAccessRights[teamId][accessRightName] === true) {
          // console.log('viewerCanSeeOrDoForThisTeamMember returning true for teamId:', teamId, ', accessRightName:', accessRightName);
          return true;
        }
      }
    }
  }
  return false;
}

const retrieveTeamMemberList = async (teamId) => {
  let status = '';
  const success = true;

  /// Retrieve the ids of the team
  // const teamMemberListPromise = findTeamMemberListByParams({ teamId });
  const teamMemberListTemp = await findTeamMemberListByParams({ teamId });
  // console.log('Team member list 1:', teamMemberListTemp);

  const teamMemberPersonIdList = teamMemberListTemp.map((member) => member.personId);
  // console.log('teamMemberPersonIdList:', teamMemberPersonIdList);
  status += `TEAM_MEMBERS_FOUND: ${teamMemberPersonIdList.length} `;

  // Retrieve the team members
  const teamMemberList = await findPersonListByIdList(teamMemberPersonIdList);
  // console.log('Team member list 2:', teamMemberList);

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

module.exports = {
  viewerCanSeeOrDoForThisTeam,
  viewerCanSeeOrDoForThisTeamMember,
  retrieveTeamMemberList,
};
