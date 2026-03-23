const { WebClient } = require('@slack/web-api');
const { savePerson, findPersonListByParams, findOnePerson } = require('../models/personModel');


// Initialize a single instance for the whole app
const webClient = new WebClient();

// https://www.npmjs.com/package/@slack/web-api
// https://tools.slack.dev/node-slack-sdk/web-api/
// https://api.slack.com/methods
// https://api.slack.com/methods/chat.postMessage/code
// https://api.slack.com/apps/A08P1E3H15J/oauth?success=1

exports.slackChannelInvite = async (request, response) => {
  const { channel: channelID, user_ids: userIDs } = request.body;
  let result;
  try {
    // This will rarely be needed, but it's needed the first time the bot tries to invite someone
    result = await webClient.conversations.join({
      token: process.env.SLACK_BOT_BEARER_TOKEN,
      channel: channelID,
    });

    console.log(result);
  } catch (errorJoin) {
    console.error(errorJoin);
  }

  try {
    // https://api.slack.com/methods/conversations.invite
    result = await webClient.conversations.invite({
      token: process.env.SLACK_BOT_BEARER_TOKEN,
      channel: channelID,
      users: userIDs,
    });

    console.log(result);
  } catch (error) {
    console.error(error);
  }
  const success = result ? result.ok : false;
  const warning = result ? result.warning : false;
  return response.json({ success, warning });
};

exports.slackChannelMembers = async (request, response) => {
  const { channel: channelID } = request.body;
  let result;
  const ret = {
    success: false,
    members: [],
    warning: '',
  };
  try {
    result = await webClient.conversations.members({
      token: process.env.SLACK_BOT_BEARER_TOKEN,
      channel: channelID,
    });
    ret.success = result.ok;
    ret.members = result.members;
    console.log(ret);
  } catch (error) {
    ret.warning = `API Error: ${error.code} - ${error.message}`;
    console.error(ret);
  }

  return response.json(ret);
};


exports.slackGetPresence = async (request, response) => {
  const { userID } = request.body;

  let result = {};
  try {
    result = await webClient.users.getPresence({
      token: process.env.SLACK_BOT_BEARER_TOKEN,
      user: userID,
    });
    result.success = result.ok;
    delete result.response_metadata;
    console.log(result);
  } catch (error) {
    result.success = false;
    result.warning = error;
    console.error(error);
  }

  return response.json(result);
};

/**
 * get user photos from Slack API and save them to the Person table
 * @param request
 * @param request personId, Person.id if for a single person update, otherwise no value
 * @param response
 * @returns
 */
exports.slackAddPersonImages = async (request, response) => {
  const { personId: incomingPersonId } = request.body;

  const personsUpdated = [];
  const singlePersonUpdated = [];
  const membersNotMatched = [];
  let errors = '';
  let success = false;
  let nextCursor = '';
  let firstPass = true;
  let person = null;
  let pages = 0;

  let incomingPersonIdInt = 0;
  let matchOnePerson = false;
  if (incomingPersonId !== undefined) {
    incomingPersonIdInt = incomingPersonId;
    matchOnePerson = incomingPersonIdInt > 0;
  }

  try {
    while (firstPass || nextCursor.length) {
      firstPass = false;
      pages += 1;

      // eslint-disable-next-line no-await-in-loop
      const result = await webClient.users.list({
        token: process.env.SLACK_BOT_BEARER_TOKEN,
        cursor: nextCursor,
        limit: 1000,
      });

      nextCursor = result?.response_metadata?.next_cursor;

      const { members: membersArray } = result;
      // eslint-disable-next-line no-restricted-syntax,guard-for-in
      for (let i = 0; i < membersArray.length; i++) {
        const member = membersArray[i];
        // Slack API provides images in 24, 32, 48, 72, 192, 512, 1024 px, and also the original raw image.
        // eslint-disable-next-line camelcase
        const { id: slackHandle, name, profile: { real_name, email, image_48: slackImage48 } } = member;
        let personSaved = false;

        // First look for a personal email match
        if (email !== undefined) {
          if (matchOnePerson) {
            if (!person) {
              // eslint-disable-next-line no-await-in-loop
              person = await findOnePerson({ id: incomingPersonIdInt });
            }
          } else {
            // eslint-disable-next-line no-await-in-loop
            const personArray = await findPersonListByParams({ OR: [
              { emailPersonal: email },
              { emailOfficial: email },
            ]});
            if (personArray.length === 0) {
              person = null;
            } else if (personArray.length > 1) {
              errors += `More-than-one-person-matches-${email} `;
              person = null;
            } else {
              [person] = personArray;
            }
          }
        }

        if (person) {
          success = true;
          const thisIsMatchingPerson =
            matchOnePerson && person.id === incomingPersonIdInt && (person.emailPersonal === email || person.emailOfficial === email);

          // Save this updated person if iterating through all persons, or if found a matching person from incomingPersonId param
          if (!matchOnePerson || thisIsMatchingPerson) {
            // eslint-disable-next-line no-await-in-loop
            await savePerson({ id: person.id, slackHandle, slackImage48 });
            const abbreviatedPerson = `id: ${person.id}, ${name}, slackHandle: ${slackHandle}`;
            console.log('saving updated person with slack id and image', abbreviatedPerson);
            personsUpdated.push(abbreviatedPerson);
            personSaved = true;
            if (matchOnePerson && thisIsMatchingPerson) {
              singlePersonUpdated.push({
                id: person.id,
                firstName: person.firstName,
                lastName: person.lastName,
                emailPersonal: person.emailPersonal,
                slackHandle,
                slackImage48,
              });
              // Updated the one incomingPersonId person so we are done
              nextCursor = '';
              break;
            } else {
              person = null;
            }
          }
        }
        if (!personSaved) {
          console.log('membersNotMatched: ', member);
          membersNotMatched.push(`slackHandle: ${slackHandle}, name: ${name}, real_name: ${real_name}, email: ${email}`);
        }
      }
      success = true;
    }
  } catch (error) {
    errors += error;
    success = false;
    console.error(error);
  }
  return response.json({
    success,
    incomingPersonId: incomingPersonId || 0,
    personsUpdatedCount: personsUpdated.length,
    membersNotMatchedCount: membersNotMatched.length,
    pages,
    errors,
    personsUpdated,
    singlePersonUpdated,
    membersNotMatched,
  });
};

exports.slackListUsers = async (request, response) => {
  const { daysRange } = request.body;
  const timeSpan = daysRange ? daysRange * 24 * 60 * 60 : 365 * 24 * 60 * 60;
  // console.log(message, channel);
  // ID of the channel you want to list the users of

  const membersList = [];
  const membersSkipped = [];
  let success = false;
  let nextCursor = '';
  let firstPass = true;

  try {
    while (firstPass || nextCursor.length) {
      firstPass = false;

      // eslint-disable-next-line no-await-in-loop
      const result = await webClient.users.list({
        token: process.env.SLACK_BOT_BEARER_TOKEN,
        cursor: nextCursor,
        limit: 5000,
      });

      nextCursor = result?.response_metadata?.next_cursor;

      const { members } = result;
      members.forEach((member) => {
        const now = Math.trunc(new Date().getTime() / 1000);
        // console.log('member.updated', now, member.updated, now - member.updated);
        const haventUpdatedInAYear = now - member.updated > timeSpan;
        if (!member.deleted && !haventUpdatedInAYear) {
          membersList.push({
            id: member.id,
            name: member.name,
            real_name: member.real_name,
            phone: member.profile.phone,
            email: member.profile.email,
            title: member.profile.title,
            image: member.profile.image_original,
            tz: member.tz,
            tz_label: member.tz_label,
            last_updated: member.updated,
            last_updated_date: new Date(member.updated * 1000),
          });
        } else {
          membersSkipped.push(`${member.id} -- ${member.name}`);
        }
      });
      // console.log(result);
    }

    console.log('Members skipped: ', membersSkipped);
    success = true;
  } catch (error) {
    console.error(error);
  }
  return response.json({ success, members: membersList });
};


// Send in a user's U code like 'U527YE5J4' and get back their direct message D code like D08NSQQ8MKQ
// eslint-disable-next-line no-unused-vars
const openConversation = async (channel) => {
  let result;
  try {
    result = await webClient.conversations.open({
      token: process.env.SLACK_BOT_BEARER_TOKEN,
      channel,
    });
    console.log('openConversation: ', result);
  } catch (e) {
    console.error('ERROR in openConversation: ', e);
  }

  return result?.channel.id;
};


const MAX_PAGE_COUNT = 50;  // ~ 656,870 total
/**
 * Find the last time a user logged into Slack, this kind of works, but hits rate limiting at 60 pages of 100
 * 50 pages only takes you back about 20 days, and takes 95 seconds to execute.
 * @param userId
 * @returns {Promise<{}>}
 */
// eslint-disable-next-line no-unused-vars
const lastLoggedIntoTeam = async (userId) => {
  const result = {};
  let page = 1;
  const t0 = Date.now();
  let login;
  try {
    do {
      // eslint-disable-next-line no-await-in-loop
      const res = await webClient.team.accessLogs({
        token: process.env.SLACK_USER_BEARER_TOKEN,
        page,
      });
      const { logins } = res;
      result.lastDateSearched = logins[logins.length - 1]?.date_last;
      login = logins.find((element) => element.user_id === userId);
      result.success = true;
      result.login = login;
      result.error = '';
      result.page = page++;
    } while (!login && page < MAX_PAGE_COUNT);
    console.log('lastLoggedIntoTeam: ', result.login?.date_last);
  } catch (e) {
    console.error('ERROR in lastLoggedIntoTeam: ', e);
    result.success = false;
    result.login = '';
    result.error = e;
  }
  result.elapsed_ms = (new Date()) - t0;

  return result;
};

/**
 * Lists team conversation channels
 * @returns {Promise<*>}
 */
// eslint-disable-next-line no-unused-vars
const conversationsList = async () => {
  let result;
  try {
    result = await webClient.conversations.list({
      token: process.env.SLACK_BOT_BEARER_TOKEN,
    });
    console.log('conversationsList: ', result);
  } catch (e) {
    console.error('ERROR in conversationsList: ', e);
  }

  return result?.channel.id;
};

exports.slackSendMessage = async (request, response) => {
  const { message, channel, sendAsBot, sender } = request.body;
  console.log('slackSendMessage: ', message, channel, sendAsBot, sender);
  let responseMessage = '';
  let success = true;

  try {
    // Call the chat.postMessage method using the WebClient
    const result = await webClient.chat.postMessage({
      token: process.env.SLACK_BOT_BEARER_TOKEN,
      channel,
      username: sendAsBot ? '' : sender,
      text: message,
    });

    console.log('slackSendMessage: ', result);
    responseMessage = result.message;
  } catch (error) {
    responseMessage = `API Error: ${error.code} - ${error.message}`;
    success = false;
    console.error(responseMessage);
  }

  return response.json({ success, message: responseMessage });
};
