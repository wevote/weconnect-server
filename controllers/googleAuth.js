const { google } = require('googleapis');
const path = require('path');

exports.getGoogleAuth = async () => {
  let auth;
  // console.log('Getting auth  process.env.GOOGLE_SUPER_ADMIN_EMAIL:', process.env.GOOGLE_SUPER_ADMIN_EMAIL);
  // Note on scopes: Need to add new ones to https://admin.google.com/ac/owl/domainwidedelegation
  // and (rarely needed) enable the API at https://console.cloud.google.com/apis/dashboard?invt=Abuqxg&project=weconnectserverapp
  await google.auth.getClient({
    keyFile: path.join(__dirname, '../jwt.keys.json'),
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
