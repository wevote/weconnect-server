const nodemailer = require('nodemailer');
const { displayFullNamePreferred } = require('./personController');
const { savePerson } = require('../models/personModel');

/**
 * Helper Function to Send Mail.
 */
const sendMail = async (mailOptions) => {
  const transportConfig = {
    host: process.env.SENDGRID_HOST,
    port: process.env.SENDGRID_PORT || 465,
    secure: true,
    auth: {
      user: process.env.SENDGRID_USER,
      pass: process.env.SENDGRID_PASSWORD,
    },
  };

  let transporter = nodemailer.createTransport(transportConfig);
  let transporterReturn;
  try {
    transporterReturn = await transporter.sendMail(mailOptions)
      .then(() => {
        console.log('successful mail send');
        // settings.req.flash(settings.successfulType, { msg: settings.successfulMsg });
      })
      .catch((err) => {
        if (err.message === 'self signed certificate in certificate chain') {
          console.log('WARNING: Self signed certificate in certificate chain. Retrying with the self signed certificate. Use a valid certificate if in production.');
          transportConfig.tls = transportConfig.tls || {};
          transportConfig.tls.rejectUnauthorized = false;
          transporter = nodemailer.createTransport(transportConfig);
          return transporter.sendMail(mailOptions)
            .then(() => {
              console.log('successful mail send via self signed fallback path');
              // settings.req.flash(settings.successfulType, { msg: settings.successfulMsg });
            });
        }
        console.log('send error: ', err.message);
        //   loggingError, err);
        // settings.req.flash(settings.errorType, { msg: settings.errorMsg });
        return err;
      });
  } catch (transporterError) {
    console.log(transporterError);
  }
  return transporterReturn;
};

exports.sendEmailValidationCode = async (person, emailType) => {
  console.log(person.lastName, emailType);
  const code = Math.floor(Math.random() * 900000) + 100000;
  const emailFrom = 'steve@podell.com'; // 'We Vote <info@wevote.us>';
  const emailTo = `${displayFullNamePreferred(person)} <${person.emailPersonal}>`;

  const emailBodyHtml =
    `To sign in to We Vote, please enter the following code on the page (in your browser) where you requested your sign in code: ${code}` +
    '<br /><br />' +
    `<div style="background-color: black; color: white; padding: 15px" >Your Code: ${code}</div>` +
    '<br /><br />' +
    'If you did not visit connect.WeVote.US, you can notify us by forwarding this email to info@WeVote.US' +
    '<br /><br />' +
    'Thank you,<br />' +
    'The We Vote Team' +
    '<br /><br /><br />' +
    `This message was sent to ${person.emailPersonal}. If you don't want to receive emails from We Vote, please unsubscribe.<br />` +
    'We Vote, Attention: Community Team, 1423 Broadway PMB 158, Oakland, CA 94612' +
    '<br /><br />';

  const info = await sendMail({
    from: emailFrom,
    to: emailTo,
    subject: 'Your Sign In Code',
    html: emailBodyHtml,
  });

  let success = false;
  if (info.responseCode !== 200) {
    console.log('Sendgrid error: ', info.message);
  } else {
    console.log('EMail message sent: %s', info.messageId);
    const personToSave = {
      ...person,
      ...{
        emailVerificationToken: code,
        emailVerified: false,
      },
    };
    savePerson(personToSave);
    success  = true;
  }
  return {
    messageId: info.messageId,
    error: info.message,
    success,
  };
};
