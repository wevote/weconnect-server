const path = require('path');
const { google } = require('googleapis');

// Key urls for admin user api
// https://admin.google.com/u/6/ac/accountsettings
// https://console.cloud.google.com/welcome?pli=1&invt=AbtsZg&project=weconnectserverapp
// https://admin.google.com/ac/owl/domainwidedelegation
// https://developers.google.com/workspace/explore?filter=&discoveryUrl=https%3A%2F%2Fadmin.googleapis.com%2F%24discovery%2Frest%3Fversion%3Ddirectory_v1&discoveryRef=resources.users.methods.list&operationId=directory.users.list
// https://developers.google.com/oauthplayground/?code=4/0AQSTgQHDpbfkg5jq3NbzIRhHzNcVQTJI3fbYtr38NoJyZhgJl15uWcq-aGKLCbBJPZa4Sw&scope=https://www.googleapis.com/auth/admin.directory.user%20https://www.googleapis.com/auth/cloud-platform

const getAuth = async () => {
  let auth;
  await google.auth.getClient({
    keyFile: path.join(__dirname, '../jwt.keys.json'),
    scopes: [
      'https://www.googleapis.com/auth/admin.directory.group',
      'https://www.googleapis.com/auth/admin.directory.group.member',
      'https://www.googleapis.com/auth/admin.directory.user',
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/cloud-platform',
    ],
    clientOptions: {
      subject: 'api.superadminuser@wevoteeducation.org',
    },
  }).then(
    (authReturned) => {
      auth = authReturned;
      console.log('Sign-in successful');
    },
    (err) => { console.error('Error signing in', err); },
  );
  return auth;
};


/**
 * Lists the first 10 users in the domain.
 *
 * @param adminClient
 */
async function listUsers (adminClient) {
  const res = await adminClient.users.list({
    customer: 'my_customer',
    // maxResults: 10,
    orderBy: 'email',
  });

  const { users } = res.data;
  if (!users || users.length === 0) {
    console.log('No users found.');
    return;
  }

  console.log('Users:');
  users.forEach((user) => {
    console.log(`${user.primaryEmail} (${user.name.fullName})`);
  });
}

/**
 * Create a user in the domain.
 *
 * @param adminClient
 * @param primaryEmail
 * @param firstName
 * @param lastName
 * @param password
 */
async function createUser (adminClient, primaryEmail, firstName, lastName, password) {
  const user = {
    kind: 'admin_directory#user',
    primaryEmail,
    password,
    name: {
      givenName: firstName,
      familyName: lastName,
    },
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
    // console.error(err);
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
    // ret.firstName = firstName;
    // ret.lastName = lastName;
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
 * GET /api/v1/create-google-user
 * Use the Google Admin SDK Directory API to add a new user to the WeVote Google organization
 */
exports.googleCreateUserAccount = async (request, response) => {
  const { primaryEmail, firstName, lastName, password } = request.body;

  console.log('googleCreateUserAccount', primaryEmail, firstName, lastName, password);

  const auth = await getAuth();
  const adminClient = google.admin({ version: 'directory_v1', auth });
  const ret = await createUser(adminClient, primaryEmail, firstName, lastName, password);
  await listUsers(adminClient);
  return response.json(ret);
};

/**
 * GET /api/v1/delete-google-user
 * Use the Google Admin SDK Directory API to delete a user from the WeVote Google organization
 */
exports.googleDeleteUserAccount = async (request, response) => {
  const { primaryEmail } = request.body;

  console.log('googleDeleteUserAccount', primaryEmail);

  const auth = await getAuth();
  const adminClient = google.admin({ version: 'directory_v1', auth });
  const ret = await deleteUser(adminClient, primaryEmail);
  await listUsers(adminClient);
  return response.json(ret);
};


