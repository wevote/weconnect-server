// weconnect-server/controllers/meetingApiController.js
const { retrieveMeetingAttendeeList } = require('./meetingController');
const {
  createMeeting, createRecurringMeeting, deleteOneMeetingAttendee, deleteMeeting,
  findMeetingById, findMeetingListByParams, findOneMeeting, findOneRecurringMeeting,
  MEETING_FIELDS_ACCEPTED, RECURRING_MEETING_FIELDS_ACCEPTED,
  removeProtectedFieldsFromMeeting,
  saveMeeting, saveRecurringMeeting, updateOrCreateMeetingAttendee,
} = require('../models/meetingModel');
const { convertToInteger } = require('../utils/convertToInteger');
const { extractVariablesToChangeFromIncomingParams } = require('./dataTransformationUtils');

/**
 * GET /api/v1/meeting-list-retrieve
 * Retrieve a list of meetings.
 */
exports.meetingListRetrieve = async (request, response) => {
  const jsonData = {
    status: '',
    success: true,
    meetingList: [],
  };
  // const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  // const queryParams = new URLSearchParams(parsedUrl.search);
  // const searchText = queryParams.get('searchText');
  // console.log('searchText:', searchText);
  try {
    const meetingList = await findMeetingListByParams({}, false);
    jsonData.success = true;
    if (meetingList && meetingList.length > 0) {
      const meetingListModified = await Promise.all(meetingList.map(async (meeting) => {
        const meetingModified = { ...meeting };
        try {
          const results = await retrieveMeetingAttendeeList(meeting.id);
          // console.log('meetingListRetrieve retrieveMeetingAttendeeList results:', results);
          meetingModified.meetingAttendeeList = results.meetingAttendeeList;
          jsonData.status += results.status;
        } catch (err) {
          jsonData.status += 'FAILED_retrieveMeetingAttendeeList ';
          console.error('Error retrieving meeting attendee list:', err);
        }
        return meetingModified;
      }));
      jsonData.meetingList = meetingListModified;
      jsonData.status += 'MEETINGS_FOUND ';
    } else {
      jsonData.status += 'MEETINGS_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/meeting-retrieve
 * Retrieve the meeting, including a list of meeting attendees.
 */
exports.meetingRetrieve = async (request, response) => {
  const jsonData = {
    status: '',
    success: true,
    meetingId: -1, // We send -1 when a meeting doesn't exist
    meetingAttendeeList: [],
  };
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const meetingId = convertToInteger(queryParams.get('meetingId'));
  // console.log('Meeting ID:', meetingId);
  if (meetingId >= 0) {
    jsonData.meetingId = meetingId;
  }
  /// Retrieve the meeting
  try {
    const meeting = await findMeetingById(meetingId);
    jsonData.success = true;
    if (meeting.id >= 0) {
      jsonData.status += 'MEETING_FOUND ';
      const modifiedMeetingDict = removeProtectedFieldsFromMeeting(meeting);
      const meetingKeys = Object.keys(modifiedMeetingDict);
      const meetingValues = Object.values(modifiedMeetingDict);
      for (let i = 0; i < meetingKeys.length; i++) {
        jsonData[meetingKeys[i]] = meetingValues[i];
      }
      try {
        const results = await retrieveMeetingAttendeeList(meetingId);
        // console.log('meetingRetrieve retrieveMeetingAttendeeList results:', results);
        jsonData.meetingAttendeeList = results.meetingAttendeeList;
        jsonData.status += results.status;
      } catch (err) {
        jsonData.status += 'FAILED_retrieveMeetingAttendeeList ';
        jsonData.success = false;
      }
      response.json(jsonData);
    } else {
      jsonData.status += 'MEETING_NOT_FOUND ';
      response.json(jsonData);
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
    response.json(jsonData);
  }
};

/**
 * GET /api/v1/meeting-save
 *
 */
exports.meetingSave = async (request, response) => {
  let shouldCreateMeeting = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const isRecurringMeeting = queryParams.get('isRecurringMeeting') === 'true';
  const meetingId = convertToInteger(queryParams.get('meetingId'));
  const recurringMeetingId = convertToInteger(queryParams.get('recurringMeetingId'));
  const teamId = convertToInteger(queryParams.get('teamId'));
  const fieldsAccepted = isRecurringMeeting ? RECURRING_MEETING_FIELDS_ACCEPTED : MEETING_FIELDS_ACCEPTED;
  let changeDict = {};
  if (meetingId >= 0) {
    changeDict = { ...changeDict, meetingId };
  }
  if (recurringMeetingId >= 0) {
    changeDict = { ...changeDict, recurringMeetingId };
  }
  if (teamId >= 0) {
    changeDict = { ...changeDict, teamId };
  }
  const changeDictExtracted = extractVariablesToChangeFromIncomingParams(queryParams, fieldsAccepted);
  changeDict = { ...changeDict, ...changeDictExtracted };
  // Set up the default JSON response.
  const jsonData = {
    meetingCreated: false,
    meetingId: -1,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.meetingId = meetingId;
    jsonData.success = true;
    const keys = Object.keys(changeDict);
    const values = Object.values(changeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    if (meetingId >= 0) {
      jsonData.status += 'MEETING_FOUND ';
    } else {
      jsonData.status += 'MEETING_TO_BE_CREATED ';
      shouldCreateMeeting = true;
    }

    if (shouldCreateMeeting) {
      let modifiedMeetingDict;
      if (isRecurringMeeting) {
        const recurringMeeting = await createRecurringMeeting(changeDict);
        jsonData.recurrintMeetingId = recurringMeeting.id;
        console.log('Created recurring meeting:', recurringMeeting);
        jsonData.status += 'RECURRING_MEETING_CREATED ';
        modifiedMeetingDict = recurringMeeting;
      } else {
        const meeting = await createMeeting(changeDict);
        jsonData.meetingId = meeting.id;
        console.log('Created new meeting:', meeting);
        jsonData.status += 'MEETING_CREATED ';
        modifiedMeetingDict = meeting;
      }
      jsonData.meetingCreated = true;
      jsonData.meetingUpdated = false;
      const meetingKeys = Object.keys(modifiedMeetingDict);
      const meetingValues = Object.values(modifiedMeetingDict);
      for (let i = 0; i < meetingKeys.length; i++) {
        jsonData[meetingKeys[i]] = meetingValues[i];
      }
    } else {
      if (isRecurringMeeting) {
        const recurringMeeting = await findOneRecurringMeeting({ id: recurringMeetingId });
        const updatedRecurringMeeting = { ...recurringMeeting, ...changeDict };
        await saveRecurringMeeting(updatedRecurringMeeting);
        jsonData.recurringMeetingId = recurringMeeting.id;
      } else {
        const meeting = await findOneMeeting({ id: meetingId });
        const updatedMeeting = { ...meeting, ...changeDict };
        await saveMeeting(updatedMeeting);
        jsonData.meetingId = meeting.id;
      }
      jsonData.meetingCreated = false;
      jsonData.meetingUpdated = true;
      jsonData.status += 'MEETING_NAME_UPDATED ';
    }
  } catch (err) {
    console.error('Error while saving meeting:', err);
    jsonData.status += err.message;
    jsonData.success = false;
    jsonData.updateErrors.push('Missing required field: meetingName');
  }

  response.json(jsonData);
};

/**
 * GET /api/v1/meeting-delete
 */
exports.meetingDelete = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const meetingId = convertToInteger(queryParams.get('meetingId'));

  // TODO, this should also clean up dependent data like MeetingAttendees that reference this meeting

  // Set up the default JSON response.
  const jsonData = {
    meetingDeleted: false,
    meetingId,
    status: '',
    success: true,
    updateErrors: [],
  };

  try {
    if (parseInt(meetingId) >= 0) {
      jsonData.status += 'MEETING_TO_BE_DELETED ';
      const meeting = await deleteMeeting(meetingId);
      console.log('Deleted meeting:', meetingId);
      jsonData.meetingDeleted = true;
      jsonData.meetingId = meeting.id;
      jsonData.status += 'MEETING_DELETED ';
    }
  } catch (err) {
    console.error('Error while deleting meeting:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};
