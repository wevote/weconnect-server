// weconnect-server/controllers/personApiController.js
const bcrypt = require('@node-rs/bcrypt');
const validator = require('validator');
const passport = require('passport');
const { createPerson, findPersonListByParams, PERSON_FIELDS_ACCEPTED, removeProtectedFieldsFromPerson,
  findOnePerson, findPersonById, savePerson,
} = require('../models/personModel');
const { extractVariablesToChangeFromIncomingParams } = require('./dataTransformationUtils');
const { updateOrCreateTeamMember } = require('../models/teamModel');
const { convertToInteger } = require('../utils/convertToInteger');
const { sendEmailValidationCode } = require('./sendEmailController');


/**
 * GET /api/v1/person-list-retrieve
 * Retrieve a list of people.
 */
exports.personListRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const searchText = queryParams.get('searchText');

  const jsonData = {
    isSearching: false,
    personList: [],
    status: '',
    success: true,
  };
  try {
    const params = {};
    if (searchText) {
      jsonData.isSearching = true;
      params.OR = [
        { firstName: { contains: searchText, mode: 'insensitive' } },
        { firstNamePreferred: { contains: searchText, mode: 'insensitive' } },
        { lastName: { contains: searchText, mode: 'insensitive' } },
        { emailPersonal: { contains: searchText, mode: 'insensitive' } },
      ];
    }
    const personList = await findPersonListByParams(params);
    jsonData.success = true;
    if (personList) {
      jsonData.personList = personList;
      jsonData.status += 'PERSON_LIST_FOUND ';
    } else {
      jsonData.status += 'PERSON_LIST_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/person-retrieve
 * Retrieve one person.
 */
exports.personRetrieve = async (request, response) => {
  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  const personId = convertToInteger(queryParams.get('personId'));
  // const searchText = queryParams.get('searchText');

  const jsonData = {
    status: '',
    success: true,
    personFound: false,
  };
  try {
    const params = Object.fromEntries(queryParams.entries());
    let person;
    if (Object.keys(params).length) {
      if (params.searchText) {
        delete params.searchText;
      }
      // jsonData.isSearching = true;
      // params.OR = [
      //   { firstName: { contains: searchText, mode: 'insensitive' } },
      //   { firstNamePreferred: { contains: searchText, mode: 'insensitive' } },
      //   { lastName: { contains: searchText, mode: 'insensitive' } },
      //   { emailPersonal: { contains: searchText, mode: 'insensitive' } },
      // ];
      person = await findOnePerson(params);
    } else {
      person = await findPersonById(personId);
    }
    jsonData.success = true;
    if (person && Object.keys(person).length) {
      jsonData.personFound = true;
      jsonData.personId = person.id;
      const keys = Object.keys(person);
      const values = Object.values(person);
      for (let i = 0; i < keys.length; i++) {
        jsonData[keys[i]] = values[i];
      }
      jsonData.status += 'PERSON_FOUND ';
    } else {
      jsonData.status += 'PERSON_NOT_FOUND ';
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }
  response.json(jsonData);
};

/**
 * GET /api/v1/person-save
 *
 */
exports.personSave = async (request, response) => {
  let shouldCreatePerson = false;
  let shouldUpdatePerson = false;

  const parsedUrl = new URL(request.url, `${process.env.BASE_URL}`);
  const queryParams = new URLSearchParams(parsedUrl.search);
  let personId = convertToInteger(queryParams.get('personId'));
  const teamId = convertToInteger(queryParams.get('teamId'));
  const teamName = queryParams.get('teamName');
  const teamMemberFirstName = queryParams.get('firstNameToBeSaved');
  const teamMemberLastName = queryParams.get('lastNameToBeSaved');
  const personChangeDict = extractVariablesToChangeFromIncomingParams(queryParams, PERSON_FIELDS_ACCEPTED);
  // Set up the default JSON response.
  const jsonData = {
    addPersonToTeamSuccessful: false,
    personCreated: false,
    personId: -1,
    personUpdated: false,
    status: '',
    success: true,
    updateErrors: [],
  };
  try {
    jsonData.personId = personId;
    jsonData.success = true;
    const keys = Object.keys(personChangeDict);
    const values = Object.values(personChangeDict);
    for (let i = 0; i < keys.length; i++) {
      jsonData[keys[i]] = values[i];
    }
  } catch (err) {
    jsonData.status += err.message;
    jsonData.success = false;
  }

  try {
    if (personId >= 0) {
      jsonData.status += 'PERSON_FOUND ';
      shouldUpdatePerson = true;
    } else {
      // TODO make sure a person with exact firstName/lastName or emailPersonal doesn't already exist in the database
      jsonData.status += 'PERSON_TO_BE_CREATED ';
      shouldCreatePerson = true;
    }

    if (shouldCreatePerson) {
      //
      const tempPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      personChangeDict.password = await bcrypt.hash(tempPassword, 10);
      const person = await createPerson(personChangeDict);
      personId = person.id;
      // console.log('Created new person:', person);
      jsonData.personCreated = true;
      jsonData.personId = person.id;
      jsonData.status += 'PERSON_CREATED ';
      const modifiedPersonDict = removeProtectedFieldsFromPerson(person);
      const personKeys = Object.keys(modifiedPersonDict);
      const personValues = Object.values(modifiedPersonDict);
      for (let i = 0; i < personKeys.length; i++) {
        jsonData[personKeys[i]] = personValues[i];
      }
    } else if (shouldUpdatePerson) {
      personChangeDict.id = personId;
      // console.log('Updating person:', personChangeDict);
      const person = await savePerson(personChangeDict);
      jsonData.personUpdated = true;
      jsonData.personId = person.id;
      jsonData.status += 'PERSON_UPDATED ';
      const modifiedPersonDict = removeProtectedFieldsFromPerson(person);
      const personKeys = Object.keys(modifiedPersonDict);
      const personValues = Object.values(modifiedPersonDict);
      for (let i = 0; i < personKeys.length; i++) {
        jsonData[personKeys[i]] = personValues[i];
      }
    }
  } catch (err) {
    console.error('Error while saving person:', err);
    jsonData.status += err.message;
    jsonData.success = false;
    jsonData.updateErrors.push('Missing required field: emailPersonal');
  }
  try {
    //
    if (personId >= 0 && teamId >= 0 && jsonData.personCreated) {
      // Add the person to the team
      const teamMemberChangeDict = {
        teamMemberFirstName,
        teamMemberLastName,
        teamName,
      };
      await updateOrCreateTeamMember(personId, teamId, teamMemberChangeDict);
      jsonData.addPersonToTeamSuccessful = true;
    }
  } catch (err) {
    console.error('Error while adding person to team:', err);
    jsonData.status += err.message;
    jsonData.success = false;
  }

  response.json(jsonData);
};

/**
 * POST /signup
 * Create a new local account.
 */
// eslint-disable-next-line consistent-return
exports.postSignup = async (req, res) => {
  const validationErrors = [];
  if (!validator.isEmail(req.body.emailPersonal)) validationErrors.push({ msg: 'Please enter a valid primary email address.' });
  // This is optional!   if (!validator.isEmail(req.body.emailOfficial)) validationErrors.push({ msg: 'Please enter a valid secondary email address.' });
  if (!validator.isLength(req.body.password, { min: 8 })) validationErrors.push({ msg: 'Password must be at least 8 characters long' });
  if (validator.escape(req.body.password) !== validator.escape(req.body.confirmPassword)) validationErrors.push({ msg: 'Passwords do not match' });
  if (validationErrors.length) {
    // req.flash('errors', validationErrors);
    // return res.redirect('/signup');
    return res.json({
      personCreated: false,
      errors: validationErrors,
      userId: -1,
      signedIn: false,
    });
  }
  req.body.email = validator.normalizeEmail(req.body.emailPersonal, { gmail_remove_dots: false });
  try {
    const existingUser = await findOnePerson({ emailPersonal: req.body.emailPersonal }, true);
    if (existingUser) {
      validationErrors.push({ msg: 'A user with the same primary email already exists' });
      return res.json({
        personCreated: false,
        errors: validationErrors,
        userId: -1,
        signedIn: false,
      });
    }
    const encryptedPwd = await bcrypt.hash(req.body.password, 10);
    const user = await createPerson({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      location: req.body.location,
      emailPersonal: req.body.emailPersonal,
      emailOfficial: req.body.emailOfficial,
      password: encryptedPwd,
    });
    req.logIn(user, (err) => {
      if (err) {
        validationErrors.push({ msg: err });
        // return next(err);
        return res.json({
          personCreated: false,
          errors: validationErrors,
          userId: -1,
          signedIn: false,
        });
      }
      return res.json({
        personCreated: true,
        errors: validationErrors,
        userId: user.id,
        signedIn: true,
      });
    });
  } catch (err) {
    // next(err);
    validationErrors.push({ msg: err });
    res.json({
      personCreated: false,
      errors: validationErrors,
      userId: -1,
      signedIn: false,
    });
  }
};

/**
 * POST /apis/v1/login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  console.log('test top in postLogin isAuthenticated: ', req.isAuthenticated());

  req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
  req.body.personalEmail = req.body.email;
  // eslint-disable-next-line consistent-return
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      // Converting from a pug redirect to an API response ... req.flash('errors', info);
      // Converting from a pug redirect to an API response ... return res.redirect('/login');
      return res.json({
        signedIn: false,
        errors: info,
        userId: -1,
        name: '',
      });
    }
    req.logIn(user, (err2) => {
      if (err2) {
        res.json({
          signedIn: false,
          errors: info + err2,
          userId: -1,
          name: '',
        });
      }

      res.json({
        signedIn: true,
        userId: user.id,
        name: user.name,
      });
      console.log('test at bottom in postLogin isAuthenticated: ', req.isAuthenticated());
    });
  })(req, res, next);
};

/**
 * POST /apis/v1/send-email-code
 * Send a verification code to the 'person's email
 */
exports.sendEmailCode = async (req, res, next) => {
  const personId = req.body.personId;
  let email = req.body.email || '';
  // const emailType = req.body.email-type || 'emailPersonal';  // {emailOfficial, emailOfficialAlternate, emailPersonal, emailPersonalAlternate, emailPreferred }

  // TODO Finish, but need to get a response to figure out

  const results = {
    emailSent: false,
    errors: '',
    userId: -1,
    name: '',
  };

  // email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });

  const person = await findPersonById(personId);
  // For now, just use person.emailPersonal

  const ret = sendEmailValidationCode(person);
  results.errors += ` ${ret.error}`;
  results.emailSent = ret.success;

  return results;



  // eslint-disable-next-line consistent-return
  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      // Converting from a pug redirect to an API response ... req.flash('errors', info);
      // Converting from a pug redirect to an API response ... return res.redirect('/login');
      return res.json({
        signedIn: false,
        errors: info,
        userId: -1,
        name: '',
      });
    }
    req.logIn(user, (err2) => {
      if (err2) {
        res.json({
          signedIn: false,
          errors: info + err2,
          userId: -1,
          name: '',
        });
      }

      res.json({
        signedIn: true,
        userId: user.id,
        name: user.name,
      });
      console.log('test at bottom in postLogin isAuthenticated: ', req.isAuthenticated());
    });
  })(req, res, next);
};

/**
 * POST /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) console.log('Error : Failed to logout.', err);
  });
  return res.json({
    authenticated: req.isAuthenticated(),
  });
};

exports.getAuth = (req, res) => {
  /* Passport JS conveniently provides a “req.isAuthenticated()” function, that
       returns “true” in case an authenticated user is present in “req.session.passport.user”, or
       returns “false” in case no authenticated user is present in “req.session.passport.user”.
   */
  console.log('test top in getAuth isAuthenticated: ', req.isAuthenticated());

  return res.json({
    authenticated: req.isAuthenticated(),
  });
};
