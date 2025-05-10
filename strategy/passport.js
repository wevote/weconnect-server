/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
const passport = require('passport');
const { DateTime } = require('luxon');
const refresh = require('passport-oauth2-refresh');
const { Strategy: LocalStrategy } = require('passport-local');
const { findPersonById, findOnePerson, comparePassword, saveUser } = require('../models/personModel');


// https://medium.com/@prashantramnyc/node-js-with-passport-authentication-simplified-76ca65ee91e5#id_token=eyJhbGciOiJSUzI1NiIsImtpZCI6IjU2NGZlYWNlYzNlYmRmYWE3MzExYjlkOGU3M2M0MjgxOGYyOTEyNjQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIyMTYyOTYwMzU4MzQtazFrNnFlMDYwczJ0cDJhMmphbTRsamRjbXMwMHN0dGcuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiIyMTYyOTYwMzU4MzQtazFrNnFlMDYwczJ0cDJhMmphbTRsamRjbXMwMHN0dGcuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDIzOTA2NDQ0MjQ4MzM3NzQ5MzciLCJlbWFpbCI6InN0ZXZlcG9kZWxsMzdAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5iZiI6MTczNDg5ODgxNSwibmFtZSI6IlN0ZXZlIFBvZGVsbCIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NKMlJPWVd6RjVfdGhIbnA5UzVmYndFRy1idGN5T1lOdmFVRktuNmEwN2JYcWI1eXZndz1zOTYtYyIsImdpdmVuX25hbWUiOiJTdGV2ZSIsImZhbWlseV9uYW1lIjoiUG9kZWxsIiwiaWF0IjoxNzM0ODk5MTE1LCJleHAiOjE3MzQ5MDI3MTUsImp0aSI6IjhmYWE2NDU3ZTdmMGFiOGRjOWIzZjgzNjU1OTkxNzA4NTcyYTRjMWUifQ.BiNYnXFRCB2u_p7mOWev-cVeVBvHXArS30fgGLh09apwOZZiIdUrjfXA94twoaLhtrYWG9Op02-CliCV-ddgby6Ej8vrXHYK4hnGlAsaUbsjxB-6ayaj_LTP3C2eBIaU5n2yRoee3K30qR5Br8_ZGrYbObjEz8ESUVgM-_YSIbnTZlZFNrM5eL4q_SwAMfNjS4aIRpfRtOuCjn_4VbTBNTA6dQfPvPF3vh2BIE9uGVsoOVWbML-H5YdJIOGiGNOt-VbdTChusNraAgrrhClYdlJVaHl3diJgzqXLZPfnzRzbcpb0a3XLO62PXtOHxl3sW6_oF_xqUATOFcgb6SR4ug

/* Convert a user object into a session object, passport should be storing this object on the server
1. "express-session" creates a "req.session" object, when it is invoked via app.use(session({..}))
2. "passport" then adds an additional object "req.session.passport" to this "req.session".
3. All the serializeUser() function does is, receives the "authenticated user" object from the "Strategy" framework, and attach the authenticated user to "req.session.passport.user.{..}"
*/
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/* retrieve user data from session
  1. Passport JS conveniently populates the "userObj" value in the deserializeUser() with the object attached at the end of "req.session.passport.user.{..}"
  2. When the done (null, user) function is called in the deserializeUser(), Passport JS takes this last object attached to "req.session.passport.user.{..}",
     and attaches it to "req.user" i.e "req.user.{..}"
     In our case, since after calling the done() in "serializeUser" we had req.session.passport.user.{id: 123, email: "kyle@wevote.us"},
     calling the done() in the "deserializeUser" will take that last object that was attached to req.session.passport.user.{..} and attach to req.user.{..}
     i.e. req.user.{id: 123, email: "kyle@wevote.us"}
  3. So "req.user" will contain the authenticated user object for that session, and you can use it in any of the routes in the Node JS app.
*/
passport.deserializeUser(async (id, done) => {
  try {
    return done(null, await findPersonById(id));
  } catch (error) {
    return done(error);
  }
});

exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.send(401);
  }
};


/**
 * Sign in using Email and Password.
 * authenticate a user, and return the "authenticated user".
 */
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  findOnePerson({ emailPersonal: email.toLowerCase() }, true)
    .then((user) => {
      if (!user) {
        return done(null, false, { msg: `Email ${email} not found.` });
      }
      if (!user.password) {
        // return done(null, false, { msg: 'Your account was registered using a sign-in provider. To enable password login, sign in using a provider, and then set a password under your user profile.' });
        return done(null, false, { msg: 'Please sign in again.' });
      }
      comparePassword(user, password, (err, isMatch) => {
        if (err) { return done(err); }
        if (isMatch) {
          // The “done()” function is then used to pass the “{authenticated_user}” to the serializeUser() function.
          return done(null, user);
        }
        return done(null, false, { msg: 'Invalid email or password.' });
      });
    })
    .catch((err) => done(err));
}));

/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

/**
 * Authorization Required middleware.
 */
exports.isAuthorized = async (req, res, next) => {
  const provider = req.path.split('/')[2];
  // eslint-disable-next-line no-shadow
  const token = req.user.tokens.find((token) => token.kind === provider);
  if (token) {
    // if (token.accessTokenExpires && moment(token.accessTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
    if (token.accessTokenExpires && (DateTime(token.accessTokenExpires) <= DateTime().minus({ minutes: 1 }))) {
      if (token.refreshToken) {
        // if (token.refreshTokenExpires && moment(token.refreshTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
        if (token.refreshTokenExpires && (DateTime(token.refreshTokenExpires) <= DateTime().minus({ minutes: 1 }))) {
          return res.redirect(`/auth/${provider}`);
        }
        try {
          const newTokens = await new Promise((resolve, reject) => {
            refresh.requestNewAccessToken(`${provider}`, token.refreshToken, (err, accessToken, refreshToken, params) => {
              if (err) reject(err);
              resolve({ accessToken, refreshToken, params });
            });
          });

          req.user.tokens.forEach((tokenObject) => {
            if (tokenObject.kind === provider) {
              tokenObject.accessToken = newTokens.accessToken;
              // if (newTokens.params.expires_in) tokenObject.accessTokenExpires = moment().add(newTokens.params.expires_in, 'seconds').format();
              if (newTokens.params.expires_in) tokenObject.accessTokenExpires = DateTime().add({ seconds: newTokens.params.expires_in }).toISO();
            }
          });

          await saveUser(req.user);
          return next();
        } catch (err) {
          console.log(err);
          return next();
        }
      } else {
        return res.redirect(`/auth/${provider}`);
      }
    } else {
      return next();
    }
  } else {
    return res.redirect(`/auth/${provider}`);
  }
};
