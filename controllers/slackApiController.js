const { WebClient } = require('@slack/web-api');

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
    console.log(result);
  } catch (error) {
    console.error(error);
  }

  return response.json({ success: result.ok, presence: result.presence });
};

exports.slackListUsers = async (request, response) => {
  const { daysRange } = request.body;
  const timeSpan = daysRange ? daysRange * 24 * 60 * 60 : 365 * 24 * 60 * 60;
  // console.log(message, channel);
  // ID of the channel you want to send the message to

  const membersList = [];
  const membersSkipped = [];
  let success = false;
  try {
    // Call the chat.postMessage method using the WebClient
    const result = await webClient.users.list({
      token: process.env.SLACK_BOT_BEARER_TOKEN,
    });

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
          last_updated_date: new Date(member.updated),
        });
      } else {
        membersSkipped.push(`${member.id} -- ${member.name}`);
      }
    });

    console.log(membersSkipped);
    success = true;
    console.log(result);
  } catch (error) {
    console.error(error);
  }
  return response.json({ success, members: membersList });
};

const openConversation = async (channel) => {
  const result = await webClient.conversations.open({
    token: process.env.SLACK_BOT_BEARER_TOKEN,
    channel,
    username: 'Steve37 Podell',
    return_im: true,
  });
  console.log('openConversation: ', result);

  return result.channel.id;
};

exports.slackSendMessage = async (request, response) => {
  const { message, channel, sendAsBot, sender } = request.body;
  console.log('slackSendMessage: ', message, channel, sendAsBot, sender);
  let responseMessage = '';
  let success = true;

  // try {
  //   const directMessageChannelId = await openConversation(channel);
  // } catch (e) {
  //   console.error('openConversation: ', e);
  // }

  try {
    // Call the chat.postMessage method using the WebClient
    const result = await webClient.chat.postMessage({
      token: process.env.SLACK_BOT_BEARER_TOKEN,
      channel,    // : directMessageChannelId,
      // username: "Stevep",
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

