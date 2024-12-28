/**
 * Module dependencies.
 */
const cors = require('cors');
const path = require('path');
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const bodyParser = require('body-parser');
const logger = require('morgan');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const flash = require('express-flash');
const passport = require('passport');
const rateLimit = require('express-rate-limit');


/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env' });

/**
 * Set config values
 */
const secureTransfer = (process.env.BASE_URL.startsWith('https'));

// Consider adding a proxy such as cloudflare for production.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// This logic for numberOfProxies works for local testing, ngrok use, single host deployments
// behind cloudflare, etc. You may need to change it for more complex network settings.
// See readme.md for more info.
let numberOfProxies;
if (secureTransfer) numberOfProxies = 1; else numberOfProxies = 0;

/**
 * Create Express server.
 */
const weconnectServer = express();

/**
 * Express configuration.
 */
weconnectServer.set('host', process.env.HOST || '0.0.0.0');
weconnectServer.set('port', process.env.PORT || 4500);
weconnectServer.set('views', path.join(__dirname, 'views'));
weconnectServer.set('view engine', 'pug');
weconnectServer.set('trust proxy', numberOfProxies);
weconnectServer.use(compression());
const corsConfig = {
  credentials: true,
  origin: true,
};
weconnectServer.use(cors(corsConfig));
weconnectServer.use(logger('dev'));
weconnectServer.use(bodyParser.json());
weconnectServer.use(bodyParser.urlencoded({ extended: true }));
weconnectServer.use(limiter);

/**
 * Signin, Authorization,
 */

// This is the basic express session({..}) initialization.
weconnectServer.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  name: 'WeConnectSession',
  cookie: {
    maxAge: 1209600000, // Two weeks in milliseconds
    secure: secureTransfer,
    allowlist: [
      { path: '/apis/v1', type: 'startWith' },
      { path: '/localhost', type: 'exact' },
      { path: '/summary', type: 'startWith' },
    ],
  },
  store: new (connectPgSimple(session))({
    createTableIfMissing: true,
  }),
  // store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })    WHAT ABOUT POSTGRES??????
}));

weconnectServer.use(passport.initialize());   // init passport on every route call.
weconnectServer.use(passport.session());      // allow passport to use "express-session".
weconnectServer.use(flash());   // TODO: probably not needed or wanted
dotenv.config({ path: '.env' });              // reads text in '.env' file into process.env global variables
// TODO: This allowlist is a hack around a csrf.js issue, where login was blocked by a csrf mismatch.  I suspect that we have an unresolved Lusca setup issue.
weconnectServer.use(lusca({
  allowlist: ['/login', '/signup'],
}));



weconnectServer.use((req, res, next) => {
  if (req.path === '/api/upload') {
    // Multer multipart/form-data handling needs to occur before the Lusca CSRF check.
    next();
  } else {
    lusca.csrf({ allowlist: ['/login', '/signup']})(req, res, next);
    // lusca.csrf()(req, res, next);
  }
});
// weconnectServer.use(lusca.xframe('SAMEORIGIN'));
// weconnectServer.use(lusca.xssProtection(true));
weconnectServer.disable('x-powered-by');
weconnectServer.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// After successful login, redirect back to the intended page
weconnectServer.use((req, res, next) => {
  if (!req.user &&
    req.path !== '/login' &&
    req.path !== '/signup' &&
    !req.path.match(/^\/auth/) &&
    !req.path.match(/\./)) {
    req.session.returnTo = req.originalUrl;
  } else if (req.user &&
    (req.path === '/account' || req.path.match(/^\/api/))) {
    req.session.returnTo = req.originalUrl;
    console.log('test in weconnect-server isAuthenticated: ', req.isAuthenticated());
  }
  next();
});

// make the req.user available globally to be able to check logged in status
weconnectServer.use((req, res, next) => {
  res.locals.login = req.user;
  next();
});



weconnectServer.use('/', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
weconnectServer.use('/js/lib', express.static(path.join(__dirname, 'node_modules/chart.js/dist'), { maxAge: 31557600000 }));
weconnectServer.use('/js/lib', express.static(path.join(__dirname, 'node_modules/popper.js/dist/umd'), { maxAge: 31557600000 }));
weconnectServer.use('/js/lib', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js'), { maxAge: 31557600000 }));
weconnectServer.use('/js/lib', express.static(path.join(__dirname, 'node_modules/jquery/dist'), { maxAge: 31557600000 }));
weconnectServer.use('/webfonts', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free/webfonts'), { maxAge: 31557600000 }));

// Middleware function to log requests
weconnectServer.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // Call next middleware
});

/**
 * WeConnect API routes.
 */
require('./routes/apiRoutes')(weconnectServer);

/**
 * Primary app routes for server based example Pug UI.
 */
require('./routes/futureApiAndPugRoutes')(weconnectServer);


/**
 * Error Handler.
 */
weconnectServer.use((req, res) => {
  const err = new Error('Not Found');
  err.status = 404;
  res.status(404).send('Page Not Found');
});

if (process.env.NODE_ENV === 'development') {
  // only use in development
  weconnectServer.use(errorHandler());
} else {
  weconnectServer.use((err, req, res) => {
    console.error(err);
    res.status(500).send('Server Error');
  });
}

/**
 * Start Express server.
 */
weconnectServer.listen(weconnectServer.get('port'), () => {
  const { BASE_URL } = process.env;
  const colonIndex = BASE_URL.lastIndexOf(':');
  const port = parseInt(BASE_URL.slice(colonIndex + 1), 10);

  if (!BASE_URL.startsWith('http://localhost')) {
    console.log(`The BASE_URL env variable is set to ${BASE_URL}. If you directly test the application through http://localhost:${weconnectServer.get('port')} instead of the BASE_URL, it may cause a CSRF mismatch or an Oauth authentication failure. To avoid the issues, change the BASE_URL or configure your proxy to match it.\n`);
  } else if (parseInt(weconnectServer.get('port')) !== port) {
    console.warn(`WARNING: The BASE_URL environment variable and the App have a port mismatch. If you plan to view the app in your browser using the localhost address, you may need to adjust one of the ports to make them match. BASE_URL: ${BASE_URL}\n`);
  }

  console.log(`App is running on http://localhost:${weconnectServer.get('port')} in ${weconnectServer.get('env')} mode.`);
  console.log('Press CTRL-C to stop.');
});

module.exports = weconnectServer;
