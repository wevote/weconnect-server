// weconnect-server/controllers/meetingController.js
const { findPersonListByIdList } = require('../models/personModel');
const { findMeetingAttendeeListByParams } = require('../models/meetingModel');

const retrieveMeetingAttendeeList = async (teamId) => {
  let status = '';
  const success = true;

  /// Retrieve the ids of the team
  const meetingAttendeeListTemp = await findMeetingAttendeeListByParams({ teamId });
  // console.log('Team member list 1:', meetingAttendeeListTemp);

  const meetingAttendeePersonIdList = meetingAttendeeListTemp.map((member) => member.personId);
  // console.log('meetingAttendeePersonIdList:', meetingAttendeePersonIdList);
  status += `TEAM_MEMBERS_FOUND: ${meetingAttendeePersonIdList.length} `;

  // Retrieve the team members
  const meetingAttendeeList = await findPersonListByIdList(meetingAttendeePersonIdList);
  // console.log('Team member list 2:', meetingAttendeeList);

  if (meetingAttendeeList) {
    // TODO augment with team membership details
    status += 'TEAM_MEMBERS_FOUND ';
  } else {
    status += 'TEAM_MEMBERS_NOT_FOUND ';
  }
  return {
    meetingAttendeeList,
    success,
    status,
  };
};

module.exports = {
  retrieveMeetingAttendeeList,
};
