const { google } = require('googleapis');

// eslint-disable-next-line no-unused-vars
exports.getGoogleAuth = async (isWeVoteEducationC3) => {
  let auth;
  // console.log('Getting auth  process.env.GOOGLE_SUPER_ADMIN_EMAIL:', process.env.GOOGLE_SUPER_ADMIN_EMAIL);
  // Note on scopes: Need to add new ones to https://admin.google.com/ac/owl/domainwidedelegation
  // and (rarely needed) enable the API at https://console.cloud.google.com/apis/dashboard?invt=Abuqxg&project=weconnectserverapp
  let keyFileJson;
  try {
    const keyFileJsonRaw = process.env.GOOGLEAPIS_JSON_WEB_TOKEN;  // doesn't matter, relies on api.superadminuser@wevoteeducation.org, not differing JWTs    isWeVoteEducationC3 ? process.env.GOOGLEAPIS_JSON_WEB_TOKEN : process.env.GOOGLEAPIS_JSON_WEB_TOKEN_C4;
    keyFileJson = JSON.parse(keyFileJsonRaw);
  } catch (error) {
    console.error('GOOGLEAPIS_JSON_WEB_TOKEN Missing');
    keyFileJson = JSON.parse('{}'); // default to empty object if error
  }
  await google.auth.getClient({
    credentials: keyFileJson,
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.group',
      'https://www.googleapis.com/auth/admin.directory.group.member',
      'https://www.googleapis.com/auth/admin.directory.user',
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/admin.datatransfer',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ],
    clientOptions: {
      subject: process.env.GOOGLE_SUPER_ADMIN_EMAIL,
    },
  }).then(
    (authReturned) => {
      auth = authReturned;
      // console.log('Sign-in successful');
    },
    (err) => { console.error('Error signing in', err); },
  );
  return auth;
};
