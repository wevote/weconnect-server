const fs = require('node:fs');
const sgMail = require('@sendgrid/mail');
const { displayFullNamePreferred } = require('./personController');
const { savePerson } = require('../models/personModel');

/**
 * Helper Function to Send Mail.
 */
const sendMail = async (msg) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error(error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
};

const readInHtmlFile = (recipientEmail, weVoteURL, code, unsubscribeEmail) => {
  let newHtml = fs.readFileSync('./misc/html/sign_in_code_email.html', 'utf8');
  newHtml = newHtml.replaceAll('TOKEN_RECIPIENT_EMAIL', recipientEmail);
  newHtml = newHtml.replaceAll('TOKEN_WE_VOTE_URL', weVoteURL);
  newHtml = newHtml.replaceAll('TOKEN_SECRET_NUMERICAL_CODE', code);
  newHtml = newHtml.replaceAll('TOKEN_UNSUBSCRIBE_EMAIL"', unsubscribeEmail);
  return newHtml;
};

exports.sendEmailValidationCode = async (person) => {
  const errorResults = {
    error: '',
    status: '',
    success: false,
  };
  let status = '';

  if (!person) {
    errorResults.error = true;
    status += 'SEND_EMAIL_NO_PERSON ';
    errorResults.status = status;
    return errorResults;
  }
  console.log('sendEmailValidationCode lastName: ', person.lastName);
  const code = Math.floor(Math.random() * 900000) + 100000;
  const emailFrom = 'We Vote <info@wevote.us>';
  const emailTo = `${displayFullNamePreferred(person)} <${person.emailPersonal}>`;

  let respError;
  const html = readInHtmlFile(person.emailPersonal, 'https://wevote.us', code, 'info@wevote.us');
  try {
    await sendMail({
      from: emailFrom,
      to: emailTo,
      subject: 'Your Sign In Code',
      html,
    });
  } catch (error) {
    status += 'FAILED_SENDING_MAIL ';
    respError = error;
  }

  if (respError) {
    console.log('Sendgrid error: ', respError.code, respError.message);
    return {
      error: `Sendgrid error code: ${respError.code}, ${respError.message}`,
      status,
      success: false,
    };
  } else {
    console.log('Sendgrid eMail message sent: %s', emailTo, code);
    status += 'SEND_EMAIL_SUCCESS ';
    await savePerson({
      id: person.id,
      emailVerificationToken: code.toString(),
      emailVerified: false,
    });
    return {
      error: '',
      status,
      success: true,
    };
  }
};
