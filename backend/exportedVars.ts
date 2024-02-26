import { SettingsObj } from '@/types/SettingsObject';
import { findEtherpadRoot, makeAbsolute } from '@/utils/backend/AbsolutePaths';
import { argvP } from '@/utils/backend/CLI';
import path from 'path';
const root = findEtherpadRoot();
const defaultLogLevel = 'INFO';

export const settings: SettingsObj = {
  root: findEtherpadRoot(),
  settingsFilename: makeAbsolute(argvP.settings || 'settings.json'),
  credentialsFilename: makeAbsolute(argvP.credentials || 'credentials.json'),
  /**
   * The app title, visible e.g. in the browser window
   */
  title: 'Etherpad',
  /**
   * Pathname of the favicon you want to use. If null, the skin's favicon is
   * used if one is provided by the skin, otherwise the default Etherpad favicon
   * is used. If this is a relative path it is interpreted as relative to the
   * Etherpad root directory.
   */
  favicon: null,

  /*
   * Skin name.
   *
   * Initialized to null, so we can spot an old configuration file and invite the
   * user to update it before falling back to the default.
   */
  skinName: null,

  skinVariants: 'super-light-toolbar super-light-editor light-background',
  /**
   * The IP ep-lite should listen to
   */
  ip: '0.0.0.0',
  /**
   * The Port ep-lite should listen to
   */
  port: process.env.PORT || 9001,
  /**
   * Should we suppress Error messages from being in Pad Contents
   */
  suppressErrorsInPadText: false,
  /**
   * The SSL signed server key and the Certificate Authority's own certificate
   * default case: ep-lite does *not* use SSL. A signed server key is not required in this case.
   */
  ssl: false,
  /**
   * socket.io transport methods
   **/
  socketTransportProtocols: ['websocket', 'polling'],
  socketIo: {
    /**
     * Maximum permitted client message size (in bytes).
     *
     * All messages from clients that are larger than this will be rejected. Large values make it
     * possible to paste large amounts of text, and plugins may require a larger value to work
     * properly, but increasing the value increases susceptibility to denial of service attacks
     * (malicious clients can exhaust memory).
     */
    maxHttpBufferSize: 10000,
  },
  /*
   * The Type of the database
   */
  dbType: 'dirty',
  /**
   * This setting is passed with dbType to ueberDB to set up the database
   */
  dbSettings: {
    filename: path.join(root, 'var/dirty.db'),
  },
  /**
   * The default Text of a new pad
   */
  defaultPadText: [
    'Welcome to Etherpad!',
    '',
    'This pad text is synchronized as you type, so that everyone viewing this page sees the same ' +
    'text. This allows you to collaborate seamlessly on documents!',
    '',
    'Etherpad on Github: https://github.com/ether/etherpad-lite',
  ].join('\n'),
  padOptions: {
    noColors: false,
    showControls: true,
    showChat: true,
    showLineNumbers: true,
    useMonospaceFont: false,
    userName: null,
    userColor: null,
    rtl: false,
    alwaysShowChat: false,
    chatAndUsers: false,
    /**
     * The default Pad Settings for a user (Can be overridden by changing the setting
     */
    lang: null,
  },

  /**
   * Whether certain shortcut keys are enabled for a user in the pad
   */
  padShortcutEnabled: {
    altF9: true,
    altC: true,
    delete: true,
    cmdShift2: true,
    return: true,
    esc: true,
    cmdS: true,
    tab: true,
    cmdZ: true,
    cmdY: true,
    cmdB: true,
    cmdI: true,
    cmdU: true,
    cmd5: true,
    cmdShiftL: true,
    cmdShiftN: true,
    cmdShift1: true,
    cmdShiftC: true,
    cmdH: true,
    ctrlHome: true,
    pageUp: true,
    pageDown: true,
  },
  /**
   * The toolbar buttons and order.
   */
  toolbar: {
    left: [
      ['bold', 'italic', 'underline', 'strikethrough'],
      ['orderedlist', 'unorderedlist', 'indent', 'outdent'],
      ['undo', 'redo'],
      ['clearauthorship'],
    ],
    right: [
      ['importexport', 'timeslider', 'savedrevision'],
      ['settings', 'embed'],
      ['showusers'],
    ],
    timeslider: [
      ['timeslider_export', 'timeslider_settings', 'timeslider_returnToPad'],
    ],
  },
  /**
   * A flag that requires any user to have a valid session (via the api) before accessing a pad
   */
  requireSession: false,
  /**
   * A flag that prevents users from creating new pads
   */
  editOnly: false,
  /**
   * Max age that responses will have (affects caching layer).
   */
  maxAge: 1000 * 60 * 60 * 6, // 6 hours
  /**
   * A flag that shows if minification is enabled or not
   */
  minify: true,
  /**
   * The path of the abiword executable
   */
  abiword: null,
  /**
   * The path of the libreoffice executable
   */
  soffice: null,
  /**
   * Should we support none natively supported file types on import?
   */
  allowUnknownFileEnds: true,
  /**
   * The log level of log4js
   */
  loglevel: defaultLogLevel,
  /**
   * Disable IP logging
   */
  disableIPlogging: false,
  /**
   * Number of seconds to automatically reconnect pad
   */
  automaticReconnectionTimeout: 0,
  /**
   * Disable Load Testing
   */
  loadTest: false,
  /**
   * Disable dump of objects preventing a clean exit
   */
  dumpOnUncleanExit: false,
  /**
   * Enable indentation on new lines
   */
  indentationOnNewLine: true,
  logconfig: null,
  /*
   * Deprecated cookie signing key.
   */
  sessionKey: null,
  /*
   * Trust Proxy, whether trust the x-forwarded-for header.
   */
  trustProxy: false,
  /*
   * Settings controlling the session cookie issued by Etherpad.
   */
  cookie: {
    keyRotationInterval: 24 * 60 * 60 * 1000,
    /*
     * Value of the SameSite cookie property. "Lax" is recommended unless
     * Etherpad will be embedded in an iframe from another site, in which case
     * this must be set to "None". Note: "None" will not work (the browser will
     * not send the cookie to Etherpad) unless https is used to access Etherpad
     * (either directly or via a reverse proxy with "trustProxy" set to true).
     *
     * "Strict" is not recommended because it has few security benefits but
     * significant usability drawbacks vs. "Lax". See
     * https://stackoverflow.com/q/41841880 for discussion.
     */
    sameSite: 'Lax',
    sessionLifetime: 10 * 24 * 60 * 60 * 1000,
    sessionRefreshInterval: 24 * 60 * 60 * 1000,
  },

  /*
   * This setting is used if you need authentication and/or
   * authorization. Note: /admin always requires authentication, and
   * either authorization by a module, or a user with is_admin set
   */
  requireAuthentication: false,
  requireAuthorization: false,
  users: {},
  /*
   * Show settings in admin page, by default it is true
   */
  showSettingsInAdminPage: true,
  /*
   * By default, when caret is moved out of viewport, it scrolls the minimum
   * height needed to make this line visible.
   */
  scrollWhenFocusLineIsOutOfViewport: {
    /*
     * Percentage of viewport height to be additionally scrolled.
     */
    percentage: {
      editionAboveViewport: 0,
      editionBelowViewport: 0,
    },

    /*
     * Time (in milliseconds) used to animate the scroll transition. Set to 0 to
     * disable animation
     */
    duration: 0,

    /*
     * Percentage of viewport height to be additionally scrolled when user presses arrow up
     * in the line of the top of the viewport.
     */
    percentageToScrollWhenUserPressesArrowUp: 0,

    /*
     * Flag to control if it should scroll when user places the caret in the last
     * line of the viewport
     */
    scrollWhenCaretIsInTheLastLineOfViewport: false,
  },
  /*
   * Expose Etherpad version in the web interface and in the Server http header.
   *
   * Do not enable on production machines.
   */
  exposeVersion: false,
  /*
   * Override any strings found in locale directories
   */
  customLocaleStrings: {},
  /*
   * From Etherpad 1.8.3 onwards, import and export of pads is always rate
   * limited.
   *
   * The default is to allow at most 10 requests per IP in a 90 seconds window.
   * After that the import/export request is rejected.
   *
   * See https://github.com/nfriedly/express-rate-limit for more options
   */

  importExportRateLimiting: {
    // duration of the rate limit window (milliseconds)
    windowMs: 90000,

    // maximum number of requests per IP to allow during the rate limit window
    max: 10,
  },
  /*
   * From Etherpad 1.9.0 onwards, commits from individual users are rate limited
   *
   * The default is to allow at most 10 changes per IP in a 1 second window.
   * After that the change is rejected.
   *
   * See https://github.com/animir/node-rate-limiter-flexible/wiki/Overall-example#websocket-single-connection-prevent-flooding for more options
   */
  commitRateLimiting: {
    // duration of the rate limit window (seconds)
    duration: 1,

    // maximum number of chanes per IP to allow during the rate limit window
    points: 10,
  },
  /*
   * From Etherpad 1.8.3 onwards, the maximum allowed size for a single imported
   * file is always bounded.
   *
   * File size is specified in bytes. Default is 50 MB.
   */
  importMaxFileSize: 50 * 1024 * 1024,
  /*
   * Disable Admin UI tests
   */
  enableAdminUITests: false,
  /*
   * Enable auto conversion of pad Ids to lowercase.
   * e.g. /p/EtHeRpAd to /p/etherpad
   */
  lowerCasePadIds: false,
  // Return etherpad version from package.json

};
