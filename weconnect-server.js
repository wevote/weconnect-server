/**
 * Module dependencies.
 */
const cors = require('cors');
const path = require('path');
const express = require('express');
const https = require('https');
const fs = require('fs');
const compression = require('compression');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const bodyParser = require('body-parser');
const logger = require('morgan');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const useragent = require('express-useragent');
const { getPersonIdBySessionId } = require('./models/clientSessionModel');

process.env.NODE_DEBUG = '';    // Use our custom http logger, that shortens long GET urls

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env' });
dotenvExpand.expand(dotenv.config());
// console.log(process.env);

/**
 * Set config values
 */
const secureTransfer = (process.env.BASE_URL.startsWith('https'));

const ACCESS_PATHS_ALLOWED_PRE_AUTH = ['/', '/favicon.ico', '/health', '/healthapis/v1/versions', '/we-vote-logo-wordmark-vertical-color-on-white-256x256.png'];
const ACCESS_APIS_ALLOWED_PRE_AUTH = ['answer-list-save', 'get-auth', 'logout', 'login', 'person-retrieve-by-email', 'question-list-retrieve', 'questionnaire-list-retrieve', 'save-password', 'send-email-code', 'task-definition-list-retrieve', 'task-group-list-retrieve', 'task-group-team-link-list-retrieve', 'verify-email-code'];

// Consider adding a proxy such as cloudflare for production.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000,               // Limit each IP to 10000 requests per `window` (here, per 15 minutes)
  standardHeaders: true,    // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,     // Disable the `X-RateLimit-*` headers
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
// weconnectServer.use(express.bodyParser({limit: '10mb'}));
weconnectServer.use(bodyParser.json({ limit: '10mb' }));
weconnectServer.use(bodyParser.urlencoded({ extended: true }));
weconnectServer.use(limiter);
weconnectServer.use(cookieParser());
weconnectServer.use(useragent.express());


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
    secure: true, // secureTransfer,
    sameSite: 'none',
    allowlist: [
      { path: '/apis/v1', type: 'startWith' },
      { path: '/localhost', type: 'exact' },
      { path: '/summary', type: 'startWith' },
    ],
  },
  store: new (connectPgSimple(session))({
    createTableIfMissing: true,
  }),
}));

weconnectServer.use(passport.initialize());   // init passport on every route call.
weconnectServer.use(passport.session());      // allow passport to use "express-session".
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
  res.locals.user = req.user;   // TODO useless Feb 19th
  next();
});

// Add isSignedIn to response if true
weconnectServer.use((req, res, next) => {
  res.locals.isSignedIn = true; // TODO hack maybe useless
  next();
});

// Check for authenticated Person when handling API requests
weconnectServer.use(async (req, res, next) => {
  const { cookies, method, sessionID, url } = req;
  let is403 = true;
  try {
    const apiPieces = url.split('/');
    const api = apiPieces[3];
    if (ACCESS_PATHS_ALLOWED_PRE_AUTH.includes(url)) {
      is403 = false;
    } else if (api && api.length > 0 && ACCESS_APIS_ALLOWED_PRE_AUTH.includes(api)) {
      is403 = false;
    } else if (cookies && cookies?.WeConnectSession && sessionID) {
      const personId = await getPersonIdBySessionId(req.sessionID || 0);
      // console.log('url:', url);
      // console.log('auth check api', api, ', apiPieces:', apiPieces);
      if (api && api.length === 0) {
        is403 = false;
      } else if (personId === 0 && !ACCESS_APIS_ALLOWED_PRE_AUTH.includes(api)) {
        is403 = true;
        console.log(`${method} ${url} 403 (Not authorized)`);  // DO NOT DELETE!:  This will be the only url logging in the console in this case
      } else {
        is403 = false;
        // console.log('auth check url  SUCCESS', url);
      }
    }
  } catch (error) {
    is403 = true;
    console.error('Exception while validating session for API request', error);
  }
  if (is403) {
    // console.log('auth check 403 at bottom', url);
    res.status(403).send('Forbidden, Not authorized');
  } else {
    // console.log('auth check url  NEXT', url);
    next();
  }
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
    // console.log('test in weconnect-server isAuthenticated: ', req.isAuthenticated());
  }
  next();
});

// make the req.user available globally to be able to check logged in status
weconnectServer.use((req, res, next) => {
  res.locals.login = req.user;   // sometimes undefined ...?
  next();
});

weconnectServer.use('/', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
weconnectServer.use('/js/lib', express.static(path.join(__dirname, 'node_modules/chart.js/dist'), { maxAge: 31557600000 }));
weconnectServer.use('/js/lib', express.static(path.join(__dirname, 'node_modules/popper.js/dist/umd'), { maxAge: 31557600000 }));
weconnectServer.use('/js/lib', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js'), { maxAge: 31557600000 }));
weconnectServer.use('/js/lib', express.static(path.join(__dirname, 'node_modules/jquery/dist'), { maxAge: 31557600000 }));
weconnectServer.use('/webfonts', express.static(path.join(__dirname, 'node_modules/@fortawesome/fontawesome-free/webfonts'), { maxAge: 31557600000 }));

// Middleware function to log HTTP requests
weconnectServer.use((req, res, next) => {
  const start = Date.now();
  let url = req.url;
  if (url.length > 100) {
    url = `${url.substring(0, 100)}...`;
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${url} ${res.statusCode} ${duration}ms`);
  });

  next();
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
 * Error Handler Middleware.
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
let privateKey;
let certificate;
let serverHttpOrHttps;

if (process.env.PROTOCOL.includes('https')) {
  // SSL/TLS Setup
  // Generated by this command:
  // openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -sha256 -days 3650 -nodes -subj "/C=US/ST=California/L=Oakland/O=WeVote/OU=dev/CN=wevote.us"
  // https://localhost:4500/apis/v1/team-list-retrieve/
  // chrome://flags/#unsafely-treat-insecure-origin-as-secure            https://localhost    Enabled
  // open -a "Google Chrome" --args --disable-web-security
  try {
    privateKey =  fs.readFileSync(process.env.HTTPS_SSL_KEY, 'utf8');
    certificate = fs.readFileSync(process.env.HTTPS_SSL_CERT, 'utf8');
  } catch (err) {
    console.error('Error reading certificate:', err);
  }

  const credentials = {
    key: privateKey,
    cert: certificate,
  };

  serverHttpOrHttps = https.createServer(credentials, weconnectServer);
} else {
  serverHttpOrHttps = weconnectServer;
}

/**
 * Start Express server.
 */
serverHttpOrHttps.listen(weconnectServer.get('port'), () => {
  const { BASE_URL } = process.env;
  const colonIndex = BASE_URL.lastIndexOf(':');
  const port = parseInt(BASE_URL.slice(colonIndex + 1), 10);

  if (!BASE_URL.startsWith('http://localhost')) {
    console.log(`The BASE_URL env variable is set to ${BASE_URL}. If you directly test the application through http://localhost:${weconnectServer.get('port')} instead of the BASE_URL, it may cause a CSRF mismatch or an Oauth authentication failure. To avoid the issues, change the BASE_URL or configure your proxy to match it.\n`);
  } else if (parseInt(weconnectServer.get('port')) !== port) {
    console.warn(`WARNING: The BASE_URL environment variable and the App have a port mismatch. If you plan to view the app in your browser using the localhost address, you may need to adjust one of the ports to make them match. BASE_URL: ${BASE_URL}\n`);
  }

  console.log(`App is running on  ${process.env.BASE_URL}  in  ${weconnectServer.get('env')} mode.`);
  console.log('Press CTRL-C to stop.');
});

module.exports = weconnectServer;
