const path = require('path');
const { google } = require('googleapis');

// Key urls for admin user api
// https://admin.google.com/u/6/ac/accountsettings
// https://console.cloud.google.com/welcome?pli=1&invt=AbtsZg&project=weconnectserverapp
// https://admin.google.com/ac/owl/domainwidedelegation
// https://developers.google.com/workspace/explore?filter=&discoveryUrl=https%3A%2F%2Fadmin.googleapis.com%2F%24discovery%2Frest%3Fversion%3Ddirectory_v1&discoveryRef=resources.users.methods.list&operationId=directory.users.list
// https://developers.google.com/oauthplayground/?code=4/0AQSTgQHDpbfkg5jq3NbzIRhHzNcVQTJI3fbYtr38NoJyZhgJl15uWcq-aGKLCbBJPZa4Sw&scope=https://www.googleapis.com/auth/admin.directory.user%20https://www.googleapis.com/auth/cloud-platform
// https://www.npmjs.com/package/googleapis

const getAuth = async () => {
  let auth;
  // console.log('Getting auth process.env.GOOGLE_SUPER_ADMIN_EMAIL:', process.env.GOOGLE_SUPER_ADMIN_EMAIL);
  await google.auth.getClient({
    keyFile: path.join(__dirname, '../jwt.keys.json'),
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.group',
      'https://www.googleapis.com/auth/admin.directory.group.member',
      'https://www.googleapis.com/auth/admin.directory.user',
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/cloud-platform',
      'https://www.googleapis.com/auth/drive',
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

/**
 * Get info about one user.
 *
 * @param adminClient
 * @param primaryEmail
 */
async function getOneUser (adminClient, primaryEmail) {
  const res = await adminClient.users.list({
    customer: 'my_customer',
    maxResults: 500,   // when we go over 500, will need to page with nextPageToken
    orderBy: 'email',
    query: `email=${primaryEmail}`,
  });

  const { users } = res.data;
  if (!users || users.length === 0) {
    console.log('No users found.');
    return [];
  }
  const user = users[0];
  // console.log(`User: ${user.primaryEmail} (${user.name.fullName})`);
  return user;
}


/**
 * Lists the first 500 users in the domain.
 *
 * @param adminClient
 */
async function listUsers (adminClient) {
  const res = await adminClient.users.list({
    customer: 'my_customer',
    maxResults: 500,   // when we go over 500, will need to page with nextPageToken
    orderBy: 'email',
  });

  const { users } = res.data;
  if (!users || users.length === 0) {
    console.log('No users found.');
    return [];
  }

  // console.log('Users:');
  const brief = [];
  users.forEach((user) => {
    brief.push(`${user.primaryEmail} (${user.name.fullName})`);
    // console.log(`${user.primaryEmail} (${user.name.fullName})`);
  });
  return brief;
}

/**
 * Create a user in the domain.
 *
 * @param {admin_directory_v1.Admin} adminClient
 * @param primaryEmail
 * @param firstName
 * @param lastName
 * @param password
 * @param phoneNumber
 */
async function createUser (adminClient, primaryEmail, firstName, lastName, password, phoneNumber) {
  const user = {
    kind: 'admin_directory#user',
    primaryEmail,
    password,
    name: {
      givenName: firstName,
      familyName: lastName,
    },
    phones: [
      {
        value: phoneNumber,
        type: 'work',
      },
      {
        value: phoneNumber,
        type: 'mobile',
      },
    ],
  };
  const ret = {};

  try {
    const res = await adminClient.users.insert({
      resource: user,
    });
    console.log(res.data);
    ret.success = true;
    ret.primaryEmail = primaryEmail;
    ret.error = '';
    ret.errorCode = '';
    ret.errors = '';
  } catch (err) {
    ret.success = false;
    ret.primaryEmail = primaryEmail;
    ret.error = err.message;
    ret.errorCode = err.code;
    ret.errors = JSON.stringify(err.errors);
  }
  return ret;
}

/**
 * Delete a user in the domain.
 *
 * @param adminClient
 * @param primaryEmail
 */
async function deleteUser (adminClient, primaryEmail) {
  const ret = {};

  // Construct request
  const request = {
    userKey: primaryEmail,
  };

  // Run request
  try {
    const res = await adminClient.users.delete(request);
    console.log(res);
    console.log(res.data);
    ret.success = true;
    ret.primaryEmail = primaryEmail;
    ret.error = '';
    ret.errorCode = '';
    ret.errors = '';
  } catch (err) {
    ret.success = false;
    ret.primaryEmail = primaryEmail;
    ret.error = err.message;
    ret.error = err.message;
    ret.errorCode = err.code;
    ret.errors = JSON.stringify(err.errors);
    // console.error(err);
  }
  return ret;
}

/**
 * Reset a user's password
 *
 * @param adminClient
 * @param primaryEmail
 * @param newPassword
 */
async function resetUserPassword (adminClient, primaryEmail, newPassword) {
  const ret = {};

  // Construct request
  const requestBody = {
    userKey: primaryEmail,
    requestBody: {
      password: newPassword,
      passwordResetType: 'ADMIN_INITIATED',
      // forcePasswordChange: true, // Optional: Force the user to change the password on next login
    },
  };

  // Run request
  try {
    const res = await adminClient.users.update({
      userKey: primaryEmail,
      resource: requestBody,
    });
    console.log('User password updated:', res.data);
    console.log(res);
    ret.primaryEmail = primaryEmail;
    ret.success = true;
    ret.error = '';
    ret.errorCode = '';
    ret.errors = '';
  } catch (err) {
    ret.success = false;
    ret.primaryEmail = primaryEmail;
    ret.error = err.message;
    ret.error = err.message;
    ret.errorCode = err.code;
    ret.errors = JSON.stringify(err.errors);
    console.error(err);
  }
  return ret;
}

/**
 * GET /api/v1/google-get-user-list
 * Use the Google Admin SDK Directory API to add a new user to the WeVote Google organization
 */
exports.googleGetUserInfo = async (request, response) => {
  const { primaryEmail } = request.body;
  const auth = await getAuth();
  const adminClient = google.admin({ version: 'directory_v1', auth });
  const user = await getOneUser(adminClient, primaryEmail);
  let ret;
  if (user.length === 0) {
    ret = {
      success: false,
      error: 'User not found',
    };
  } else {
    ret = {
      success: true,
      firstName: user.name.givenName,
      lastName: user.name.familyName,
      fullName: user.name.fullName,
      phoneNumber: user.phones[0].value,
      primaryEmail: user.emails[0].address,
      lastLoginTime: user.lastLoginTime,
      isMailboxSetup: user.isMailboxSetup,
      // Less important
      creationTime: user.creationTime,
      changePasswordAtNextLogin: user.changePasswordAtNextLogin,
      agreedToTerms: user.agreedToTerms,
      archived: user.archived,
      googleUserId: user.id,
      isAdmin: user.isAdmin,
      isDelegatedAdmin: user.isDelegatedAdmin,
      isSuspended: user.suspended,
    };
  }
  return response.json(ret);
};

/**
 * GET /api/v1/google-get-user-list
 * Use the Google Admin SDK Directory API to add a new user to the WeVote Google organization
 */
exports.googleGetUserList = async (request, response) => {
  const auth = await getAuth();
  const adminClient = google.admin({ version: 'directory_v1', auth });
  const users = await listUsers(adminClient);

  return response.json(users);
};

/**
 * GET /apis/v1/google-create-user
 * Use the Google Admin SDK Directory API to add a new user to the WeVote Google organization
 */
exports.googleCreateUserAccount = async (request, response) => {
  const { primaryEmail, firstName, lastName, password, phoneNumber } = request.body;
  const auth = await getAuth();
  const adminClient = google.admin({ version: 'directory_v1', auth });
  const ret = await createUser(adminClient, primaryEmail, firstName, lastName, password, phoneNumber);

  return response.json(ret);
};

/**
 * GET /api/v1/google-delete-user
 * Use the Google Admin SDK Directory API to delete a user from the WeVote Google organization
 */
exports.googleDeleteUserAccount = async (request, response) => {
  const { primaryEmail } = request.body;
  const auth = await getAuth();
  const adminClient = google.admin({ version: 'directory_v1', auth });
  const ret = await deleteUser(adminClient, primaryEmail);

  return response.json(ret);
};

/**
 * GET /apis/v1/google-reset-user-password
 * Use the Google Admin SDK Directory API to reset a user's Google password
 */
exports.googleResetUserPassword = async (request, response) => {
  const { primaryEmail, newPassword } = request.body;
  const auth = await getAuth();
  const adminClient = google.admin({ version: 'directory_v1', auth });
  const ret = await resetUserPassword(adminClient, primaryEmail, newPassword);

  return response.json(ret);
};


exports.googleGrantDriveAccess = async (request, response) => {
  // const { primaryEmail, driveFolder, writeAccess } = request.body;
  const auth = await getAuth();
  const driveClient = google.drive({ version: 'v3', auth });

  let res;
  try {
    res = await driveClient.files.list({
      pageSize: 10, // Set the desired number of files to retrieve
      fields: 'files(name, id)', // Specify the fields to include in the response
    });
    const { files } = res.data;
    console.log(files);
    res.json(files);
  } catch (err) {
    console.log('googleGrantDriveAccess', err);
  }
  console.log(res?.data);
  return response.json(res?.data);
};


