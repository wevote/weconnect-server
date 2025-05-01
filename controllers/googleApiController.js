const { google } = require('googleapis');

// Key urls for admin, drive, datatransfer, & user apis
// https://admin.google.com/u/6/ac/accountsettings
// https://console.cloud.google.com/welcome?pli=1&invt=AbtsZg&project=weconnectserverapp
// https://admin.google.com/ac/owl/domainwidedelegation
// https://developers.google.com/workspace/explore?filter=&discoveryUrl=https%3A%2F%2Fadmin.googleapis.com%2F%24discovery%2Frest%3Fversion%3Ddirectory_v1&discoveryRef=resources.users.methods.list&operationId=directory.users.list
// https://developers.google.com/oauthplayground/?code=4/0AQSTgQHDpbfkg5jq3NbzIRhHzNcVQTJI3fbYtr38NoJyZhgJl15uWcq-aGKLCbBJPZa4Sw&scope=https://www.googleapis.com/auth/admin.directory.user%20https://www.googleapis.com/auth/cloud-platform
// https://www.npmjs.com/package/googleapis
// https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list?apix_params=%7B%22includeTeamDriveItems%22%3Atrue%2C%22supportsTeamDrives%22%3Atrue%7D
// https://developers.google.com/oauthplayground/   to generate a bearer token for curl tests of apis

const getAuth = async () => {
  let auth;
  // console.log('Getting auth process.env.GOOGLE_SUPER_ADMIN_EMAIL:', process.env.GOOGLE_SUPER_ADMIN_EMAIL);
  // Note on scopes: Need to add new ones to https://admin.google.com/ac/owl/domainwidedelegation
  // and (rarely needed) enable the API at https://console.cloud.google.com/apis/dashboard?invt=Abuqxg&project=weconnectserverapp
  let keyFileJson;
  try {
    const keyFileJsonRaw = process.env.GOOGLEAPIS_JSON_WEB_TOKEN;
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
      // console.log('oAuth2 successful ');
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
    console.log('getOneUser: No users found.');
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
    maxResults: 500,   // when we exceed 500 active staff, will need to page with nextPageToken
    orderBy: 'email',
  });

  const { users } = res.data;
  if (!users || users.length === 0) {
    console.log('listUsers: No users found.');
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
 * @param personalEmail
 * @param firstName
 * @param lastName
 * @param password
 * @param phoneNumber
 */
async function createUser (adminClient, primaryEmail, personalEmail, firstName, lastName, password, phoneNumber) {
  const user = {
    kind: 'admin_directory#user',
    primaryEmail,
    password,
    name: {
      givenName: firstName,
      familyName: lastName,
    },
    emails: [
      {
        address: primaryEmail,
        type: 'work',
      },
      {
        address: personalEmail,
        type: 'home',
      },
    ],
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
 * List all the files shared with a user in Drive for wevoteeducation.org
 * The drive MUST BE SHARED with the user in GOOGLE_SUPER_ADMIN_EMAIL for this API call to return anything
 * @param driveClient
 */
async function listDriveFiles (driveClient) {
  let res;
  let filesToReturn = [];
  try {
    res = await driveClient.files.list({
      includeTeamDriveItems: true,
      supportsTeamDrives: true,
      // queryTerm,
      // pageSize: 10, // Set the desired number of files to retrieve
      // fields: 'files(name, id)', // Specify the fields to include in the response
    });
    const { files } = res.data;
    console.log(files);
    filesToReturn = files;
  } catch (err) {
    console.log('ERROR listDriveFiles:', err);
  }
  return filesToReturn;
}

// This works fine in the API Explorer at
// https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list?apix_params=%7B%22corpora%22%3A%22user%22%2C%22includeItemsFromAllDrives%22%3Atrue%2C%22q%22%3A%22%27steve.podell%40wevoteeducation.org%27%20in%20owners%22%2C%22supportsAllDrives%22%3Atrue%7D
// But none of the queries work here, except for a query using a super user email account which retrieves all
// eslint-disable-next-line no-unused-vars
async function listDriveFilesLimitedByEmail (driveClient) {
  let res;
  let filesToReturn = [];
  try {
    // const q = "(mimeType = 'application/vnd.google-apps.folder')";   // ******* works!  returned 92 folders
    // const q = "('steve.podell@wevoteeducation.org' in writers)";     // ******* works!  returned 100 mixture of folder.spreadsheet text/csv shortcut text/plain
    // const q = "('me' in writers)";   // returned 346 (all of them), me is probably then added another and shared it with weconnectserverappserviceaccou and it wennt to 347
    // const q = "'abie.test' in writers";   // This works in the try me, 0 here
    // const q = "'steve.podell@wevoteeducation.org' in owners";   // 0 here, 3 in try me API Explorer
    // const q = '\'act.test@wevoteeducation.org\' in writers';   // 0
    const q = '';

    // runSample(q);

    res = await driveClient.files.list({
      corpora: 'user',
      includeItemsFromAllDrives: true,
      q,
      supportsAllDrives: true,
      fields: '*',
      // pageSize: 500, // Set the desired number of files to retrieve
      // fields: 'nextPageToken, files(id, name, modifiedTime)',
      // fields: 'files(name, id)', // Specify the fields to include in the response
    });
    const { files } = res.data;
    console.log('listDriveFilesLimitedByEmail', files);
    filesToReturn = files;
  } catch (err) {
    console.log('ERROR listDriveFilesLimitedByEmail:', err);
  }
  return filesToReturn;
}

// 4/19/25 -- this (bad workaround) "works" but only finds files owned by Dale, and a couple of others, none of mine, and none of my test accounts
async function getPermissionsToTransfer (driveClient, primaryEmail) {
  let res;
  const filesToReturn = [];
  let pageToken = '';       // nextPageToken in docs!
  let firstPass = true;
  let cnt = 0;
  try {
    while (firstPass || pageToken) {
      firstPass = false;
      // eslint-disable-next-line no-await-in-loop
      res = await driveClient.files.list({
        corpora: 'user',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        fields: '*',
        pageToken,
      });
      const { nextPageToken, files } = res.data;
      pageToken = nextPageToken;
      // eslint-disable-next-line no-loop-func
      files.forEach((file) => {
        cnt++;
        file.owners.forEach((owner) => {
          console.log(cnt, owner.emailAddress, file.name, file.kind);
        });
        const matchingOwner = file.owners.find((owner) => owner.emailAddress === primaryEmail);
        if (matchingOwner) {
          filesToReturn.push({
            kind: file.kind,
            ownerEmailAddress: matchingOwner.emailAddress,
            permissionId: matchingOwner.permissionId,
            fileId: file.id,
            fileName: file.name,
          });
          console.log('getPermissionsToTransfer: ', filesToReturn.length, file.name);
        }
      });
    }
  } catch (err) {
    console.log('ERROR listDriveFilesLimitedByEmail:', err);
  }
  return filesToReturn;
}




/**
 * Get the id for a folder in Drive for wevoteeducation.org
 * The drive MUST BE SHARED with the user in GOOGLE_SUPER_ADMIN_EMAIL for this API call to return anything
 * @param driveClient
 * @param directory, for example 'Engineering, WVE'
 */
async function driveIdForDirectory (driveClient) {   // , directory -- currently only returns root dir
  let res;
  let fileId = '';
  const query = '';    // `(mimeType='application/vnd.google-apps.folder' and name='${directory.trim()}')`;
  // const query = `name='${directory.trim()}'`;

  try {
    res = await driveClient.files.list({
      includeTeamDriveItems: true,
      supportsTeamDrives: true,
      q: query,
    });
    const { files } = res.data;
    if (files.length > 0) {
      // console.log(files);
      fileId = files[0].id;
    }
  } catch (err) {
    console.log('ERROR driveIdForDirectory:', err);
  }
  console.log('driveIdForDirectory: ', fileId);
  return fileId;
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

async function getDataTransferApplicationResourceId (transferClient) {
  try {
    const serverResponse = await transferClient.applications.list();
    const app = serverResponse.data.applications.find((appElement) => appElement.name === 'Drive and Docs');
    return app.id;
  } catch (e) {
    console.log('ERROR transferClient.applications.list:', e);
    return '';
  }
}

/**
 * Transfer a user's ownership of files and folders to a new user
 * https://developers.google.com/workspace/admin/data-transfer/v1/transfer-data
 *
 * @param adminClient
 * @param oldOwnerUserId
 * @param newOwnerEmail
 */
// eslint-disable-next-line no-unused-vars
async function transferDriveFilesAndFoldersOwnership (adminClient, transferClient, oldOwnersEmail, newOwnersEmail) {
  let serverResponse = {};

  const oldOwner = await getOneUser(adminClient, oldOwnersEmail);
  const oldOwnerUserId = oldOwner.id;
  const newOwner = await getOneUser(adminClient, newOwnersEmail);
  const newOwnerUserId = newOwner.id;

  console.log('transferDriveFilesAndFoldersOwnership: ', oldOwner, oldOwnerUserId, newOwner, newOwnerUserId);

  // TODO error checking

  // 4/11/25 posted: https://stackoverflow.com/questions/79569838/ownership-transfer-of-google-drive-files-using-the-node-api-fails-with-missing
  // https://www.google.com/search?q=Google+Docs+and+Google+Drive+Application+ID
  // https://developers.google.com/workspace/explore?filter=&discoveryUrl=https%3A%2F%2Fadmin.googleapis.com%2F%24discovery%2Frest%3Fversion%3Ddatatransfer_v1&discoveryRef=resources.transfers.methods.insert&operationId=datatransfer.transfers.insert

  const applicationId = await getDataTransferApplicationResourceId(transferClient);

  const requestBody = {
    kind: 'admin#datatransfer#DataTransfer',
    oldOwnerUserId,
    newOwnerUserId,
    applicationDataTransfers: [{
      applicationId,
      // In some dart code from github, /// [customerId] - Immutable ID of the Google Workspace account. (is passed into the insert request)
      // applicationId: '103626277937150531336', // Service account, Unique ID:  jwt.keys.json ... '"You'll be provided with a Client ID and Client Secret. The Client ID is the application ID you need."
      // applicationId: '0B4Sb2OJjaaGOfk53TmxCV3F6bnpQaGVhNGdFdEZ5MU1FZ2o2bl9obEpIUlhMN2Y3cjlGTEk', // from the url
      // applicationId: '435070579839',  // https://developers.google.com/workspace/admin/data-transfer/v1/transfer-data
      // applicationId: '55656082996',  // Google Docs and Google Drive (Application ID: 55656082996), same for all api users The https://developers.google.com/workspace/admin/data-transfer/v1/parameters
      // applicationId: 1008827788717,  // The Client ID from https://console.cloud.google.com/welcome?pli=1&invt=AbugjA&project=weconnectserverapp
      // applicationId: 103626277937150531336,  // The Client ID from https://admin.google.com/ac/owl/domainwidedelegation
      applicationTransferParams: [
        {
          key: 'RELEASE_RESOURCES',
          value: [
            'TRUE',
          ],
        },
        {
          key: 'PRIVACY_LEVEL',
          value: [
            'PRIVATE',
            'SHARED',
          ],
        },
      ],
    }],
  };

  try {
    serverResponse = await transferClient.transfers.insert(requestBody);
  } catch (e) {
    console.log('ERROR driveDriveFilesAndFoldersOwnership:', e);
  }
  console.log('transferDriveFilesAndFoldersOwnership:', serverResponse);

  return serverResponse;
}

/**
 * GET /apis/v1/google-get-user-info
 * Use the Google Admin SDK Directory API to add a new user to the WeVote Google organization
 */
exports.googleGetUserInfo = async (request, response) => {
  try {
    const { primaryEmail } = request.body;
    const auth = await getAuth();
    const adminClient = google.admin({ version: 'directory_v1', auth });
    const user = await getOneUser(adminClient, primaryEmail);
    // console.log('primaryEmail:', primaryEmail, ', Google User:', user);
    let ret;
    if (!user || user.length === 0) {
      ret = {
        isMailboxSetup: false,
        status: 'User not found',
        success: true,
        userFound: false,
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
        thumbnailPhotoUrl: user.thumbnailPhotoUrl,
        userFound: true,
        // Less important
        creationTime: user.creationTime,
        changePasswordAtNextLogin: user.changePasswordAtNextLogin,
        agreedToTerms: user.agreedToTerms,
        archived: user.archived,
        googleUserId: user.id,
        isAdmin: user.isAdmin,
        isArchived: user.archived,
        isDelegatedAdmin: user.isDelegatedAdmin,
        isSuspended: user.suspended,
      };
    }
    return response.json(ret);
  } catch (error) {
    console.error('Error in googleGetUserInfo:', error);
    return response.status(500).json({ error: `Error in googleGetUserInfo: ${error}` });
  }
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
  const { personalEmail, primaryEmail, firstName, lastName, password, phoneNumber } = request.body;
  const auth = await getAuth();
  const adminClient = google.admin({ version: 'directory_v1', auth });
  const ret = await createUser(adminClient, primaryEmail, personalEmail, firstName, lastName, password, phoneNumber);

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
 * POST /apis/v1/google-reset-user-password
 * Use the Google Admin SDK Directory API to reset a user's Google password
 */
exports.googleResetUserPassword = async (request, response) => {
  const { primaryEmail, newPassword } = request.body;
  const auth = await getAuth();
  const adminClient = google.admin({ version: 'directory_v1', auth });
  const ret = await resetUserPassword(adminClient, primaryEmail, newPassword);

  return response.json(ret);
};

/**
 * POST /apis/v1/google-drive-list-files
 * Use the Google Drive SDK Directory API to list the files in the drive
 */
exports.googleDriveListFiles = async (request, response) => {
  const auth = await getAuth();
  const driveClient = google.drive({ version: 'v3', auth });
  const filesToReturn = await listDriveFiles(driveClient);
  return response.json(filesToReturn);
};

/**
 * POST /apis/v1/google-share-drive-access
 * Use the Google Drive SDK Directory API to grant access (share) directories in the drive
 */
exports.googleShareDriveAccess = async (request, response) => {
  const { primaryEmail, driveFolder, driveFolderId: driveFolderIdIncoming, role } = request.body;
  let status = '';
  let success = false;
  let driveFolderId = '';
  let error = '';
  const auth = await getAuth();
  const driveClient = google.drive({ version: 'v3', auth });
  status += `primaryEmail: ${primaryEmail}, driveFolderIdIncoming: ${driveFolderIdIncoming} `;
  console.log(status);
  if (driveFolderIdIncoming) {
    driveFolderId = driveFolderIdIncoming;
  } else if (driveFolder && driveFolder.length === 0) {
    driveFolderId = await driveIdForDirectory(driveClient, driveFolder);
  }
  if (!driveFolderId) {
    success = false;
    error = `Unable to find drive folder: ${status} `;
  } else {
    try {
      const res = await driveClient.permissions.create({
        fileId: driveFolderId,
        requestBody: {
          type: 'user',         // Or 'group'
          role,                 // 'reader', 'commenter', 'writer', or 'owner'
          emailAddress: primaryEmail,
        },
        fields: 'id',
      });
      console.log(`File shared with ${primaryEmail} (Permission ID: ${res.data.id})`);
      success = true;
    } catch (err) {
      error = `Error sharing file: ${err} ${status} `;
      console.error(error);
    }
  }
  return response.json({
    success,
    driveFolder,
    driveFolderId,
    error,
  });
};

/**
 * POST /apis/v1/google-revoke-drive-access
 * Use the Google Drive SDK Directory API to grant access (share) directories in the drive
 * https://stackoverflow.com/questions/65227750/how-to-execute-data-transfer-api
 * Always transfer ownership when revoking
 */

/* Failure to implement (for now!)
   I can get driveClient.permissions.list, and it returns the ~150 users who have been granted drive permission
   But driveClient.files.list() returns no data when called from this file, unless queried without a 'q' query, in which case you get all files, and with fields: '*', you get permissions and owners (scratch_28.json)
   so I tried a workaround of searching ALL files for the owner whose email matches, and it is super slow, and doesn't return any newer files
 */
exports.googleRevokeDriveAccess = async (request, response) => {
  // eslint-disable-next-line no-unused-vars
  const { oldOwnersEmail, newOwnersEmail } = request.body;
  let success = false;
  let error = '';
  const primaryEmail = oldOwnersEmail;
  const auth = await getAuth();
  // Waiting for response https://stackoverflow.com/questions/79569838/ownership-transfer-of-google-drive-files-using-the-node-api-fails-with-missing
  // const adminClient = google.admin({ version: 'directory_v1', auth });
  // const transferClient = google.admin({ version: 'datatransfer_v1', auth });
  // const ret = await transferDriveFilesAndFoldersOwnership(adminClient, transferClient, oldOwnersEmail, newOwnersEmail);
  // console.log(ret);

  const driveClient = google.drive({ version: 'v3', auth });
  const driveFolderId = await driveIdForDirectory(driveClient, 'We Vote Education');  // This matches the 72 char id, in the url when I browse the Drive
  if (driveFolderId.length === 0) {
    success = false;
    error = 'Unable to find drive folder';
  } else {
    try {
      // eslint-disable-next-line no-unused-vars
      const permissions = await getPermissionsToTransfer(driveClient, primaryEmail);  // TODO: maybe we can enhance to revoke all permission, but lets start with transfers

      // const pList = await driveClient.permissions.list({
      //   fileId: driveFolderId,  // <---this is ID of a shared drive, not a file
      //   emailAddress: oldOwnersEmail,
      //   supportsAllDrives: true,
      //   fields: '*',
      //   // fields: 'permissions/permissionDetails',
      // });
      // console.log('permissions.list: ',pList);
      // const { data: { permissions } } = pList;
      // permissions.forEach(async (permission) => {
      //   // const res = await driveClient.permissions.delete({
      //   //   fileId: driveFolderId,
      //   //   permissionId: permission.id,
      //   // });
      //   console.log('permission deleted: ', permission);
      //   // console.log('permission deleted: ', res);
      // });

      // console.log(`File sharing removed for ${primaryEmail} (Permission ID: ${res.data.id})`);
      success = true;
    } catch (err) {
      error = `Error sharing file: ${err}`;
      console.error(error);
    }
  }

  return response.json({
    success,
    res: '',
    // driveFolderId,
    error,
  });
};

