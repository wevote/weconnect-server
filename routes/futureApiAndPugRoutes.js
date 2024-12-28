const path = require('path');
const lusca = require('lusca');
const passport = require('passport');
const multer = require('multer');

const passportConfig = require('../config/passport');
const homeController = require('../controllers/home');
const prismaUserController = require('../controllers/userController');
const apiController = require('../controllers/futureOptionsApiController');
const contactController = require('../controllers/contact');

const upload = multer({ dest: path.join(__dirname, 'uploads') });


// const upload = multer({ dest: path.join(__dirname, 'uploads') });
/**
 * Primary app routes for server based example Pug UI.
 */
module.exports = function (weconnectServer) {
  weconnectServer.get('/', homeController.index);
  // weconnectServer.get('/login', prismaUserController.getLogin);
  // weconnectServer.post('/login', prismaUserController.postLogin);
  weconnectServer.get('/logout', prismaUserController.logout);
  weconnectServer.get('/forgot', prismaUserController.getForgot);
  weconnectServer.post('/forgot', prismaUserController.postForgot);
  weconnectServer.get('/reset/:token', prismaUserController.getReset);
  weconnectServer.post('/reset/:token', prismaUserController.postReset);
  // weconnectServer.get('/signup', prismaUserController.getSignup);
  // weconnectServer.post('/signup', prismaUserController.postSignup);
  weconnectServer.get('/contact', contactController.getContact);
  weconnectServer.post('/contact', contactController.postContact);
  weconnectServer.get('/account/verify', passportConfig.isAuthenticated, prismaUserController.getVerifyEmail);
  weconnectServer.get('/account/verify/:token', passportConfig.isAuthenticated, prismaUserController.getVerifyEmailToken);
  weconnectServer.get('/account', passportConfig.isAuthenticated, prismaUserController.getAccount);
  weconnectServer.post('/account/profile', passportConfig.isAuthenticated, prismaUserController.postUpdateProfile);
  weconnectServer.post('/account/password', passportConfig.isAuthenticated, prismaUserController.postUpdatePassword);
  weconnectServer.post('/account/delete', passportConfig.isAuthenticated, prismaUserController.postDeleteAccount);
  weconnectServer.get('/account/unlink/:provider', passportConfig.isAuthenticated, prismaUserController.getOauthUnlink);

  /**
   * API examples routes.
   */
  weconnectServer.get('/api', apiController.getApi);
  weconnectServer.get('/api/lastfm', apiController.getLastfm);
  weconnectServer.get('/api/nyt', apiController.getNewYorkTimes);
  weconnectServer.get('/api/steam', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getSteam);
  weconnectServer.get('/api/stripe', apiController.getStripe);
  weconnectServer.post('/api/stripe', apiController.postStripe);
  weconnectServer.get('/api/scraping', apiController.getScraping);
  // app.get('/api/twilio', apiController.getTwilio);
  // app.post('/api/twilio', apiController.postTwilio);
  weconnectServer.get('/api/foursquare', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFoursquare);
  weconnectServer.get('/api/tumblr', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getTumblr);
  weconnectServer.get('/api/facebook', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFacebook);
  weconnectServer.get('/api/github', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getGithub);
  weconnectServer.get('/api/twitch', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getTwitch);
  weconnectServer.get('/api/paypal', apiController.getPayPal);
  weconnectServer.get('/api/paypal/success', apiController.getPayPalSuccess);
  weconnectServer.get('/api/paypal/cancel', apiController.getPayPalCancel);
  weconnectServer.get('/api/lob', apiController.getLob);
  weconnectServer.get('/api/upload', lusca({ csrf: true }), apiController.getFileUpload);
  weconnectServer.post('/api/upload', upload.single('myFile'), lusca({ csrf: true }), apiController.postFileUpload);
  weconnectServer.get('/api/pinterest', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getPinterest);
  weconnectServer.post('/api/pinterest', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.postPinterest);
  weconnectServer.get('/api/here-maps', apiController.getHereMaps);
  weconnectServer.get('/api/google-maps', apiController.getGoogleMaps);
  weconnectServer.get('/api/google/drive', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getGoogleDrive);
  weconnectServer.get('/api/chart', apiController.getChart);
  weconnectServer.get('/api/google/sheets', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getGoogleSheets);
  weconnectServer.get('/api/quickbooks', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getQuickbooks);

  /**
   * OAuth authentication routes. (Sign in)
   */
  weconnectServer.get('/auth/snapchat', passport.authenticate('snapchat'));
  weconnectServer.get('/auth/snapchat/callback', passport.authenticate('snapchat', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });
  weconnectServer.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'public_profile']}));
  weconnectServer.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });
  weconnectServer.get('/auth/github', passport.authenticate('github'));
  weconnectServer.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });
  weconnectServer.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets.readonly'],
    accessType: 'offline',
    prompt: 'consent',
  }));
  weconnectServer.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });
  weconnectServer.get('/auth/twitter', passport.authenticate('twitter'));
  weconnectServer.get('/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });
  weconnectServer.get('/auth/linkedin', passport.authenticate('linkedin', { state: 'SOME STATE' }));
  weconnectServer.get('/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });
  weconnectServer.get('/auth/twitch', passport.authenticate('twitch', {}));
  weconnectServer.get('/auth/twitch/callback', passport.authenticate('twitch', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo || '/');
  });

  /**
   * OAuth authorization routes. (API examples)
   */
  weconnectServer.get('/auth/foursquare', passport.authorize('foursquare'));
  weconnectServer.get('/auth/foursquare/callback', passport.authorize('foursquare', { failureRedirect: '/api' }), (req, res) => {
    res.redirect('/api/foursquare');
  });
  weconnectServer.get('/auth/tumblr', passport.authorize('tumblr'));
  weconnectServer.get('/auth/tumblr/callback', passport.authorize('tumblr', { failureRedirect: '/api' }), (req, res) => {
    res.redirect('/api/tumblr');
  });
  weconnectServer.get('/auth/steam', passport.authorize('steam-openid', { state: 'SOME STATE' }));
  weconnectServer.get('/auth/steam/callback', passport.authorize('steam-openid', { failureRedirect: '/api' }), (req, res) => {
    res.redirect(req.session.returnTo);
  });
  weconnectServer.get('/auth/pinterest', passport.authorize('pinterest', { scope: 'read_public write_public' }));
  weconnectServer.get('/auth/pinterest/callback', passport.authorize('pinterest', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/api/pinterest');
  });
  weconnectServer.get('/auth/quickbooks', passport.authorize('quickbooks', {
    scope: ['com.intuit.quickbooks.accounting'],
    state: 'SOME STATE',
  }));
  weconnectServer.get('/auth/quickbooks/callback', passport.authorize('quickbooks', { failureRedirect: '/login' }), (req, res) => {
    res.redirect(req.session.returnTo);
  });
};
