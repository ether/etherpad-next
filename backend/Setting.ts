'use strict';
/**
 * The Settings module reads the settings out of settings.json and provides
 * this information to the other modules
 *
 * TODO muxator 2020-04-14:
 *
 * 1) get rid of the reloadSettings() call at module loading;
 * 2) provide a factory method that configures the settings module at runtime,
 *    reading the file name either from command line parameters, from a function
 *    argument, or falling back to a default.
 */

/*
 * 2011 Peter 'Pita' Martischka (Primary Technology Ltd)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import pinoLogger from 'pino';
import { SettingsObj } from '@/types/SettingsObject';
import { findEtherpadRoot, makeAbsolute } from '@/utils/backend/AbsolutePaths';
import { argvP } from '@/utils/backend/CLI';
const suppressDisableMsg =
  ' -- To suppress these warning messages change ' +
  'suppressErrorsInPadText to true in your settings.json\n';
import minify from '@/utils/backend/minify';

// Exported values that settings.json and credentials.json cannot override.
const nonSettings = ['credentialsFilename', 'settingsFilename'];

let logger: any | undefined = undefined;

const defaultLogLevel = 'INFO';

const initLogging = (level: string) => {
  logger = pinoLogger({
    level: level.toLowerCase(),
    transport: {
      target: 'pino-pretty',
    },
  });
  // Overwrites for console output methods
  console.debug = logger.debug.bind(logger);
  console.log = logger.info.bind(logger);
  console.warn = logger.warn.bind(logger);
  console.error = logger.error.bind(logger);
};

// Initialize logging as early as possible with reasonable defaults. Logging will be re-initialized
// with the user's chosen log level and logger config after the settings have been loaded.
initLogging(defaultLogLevel);

const root = findEtherpadRoot();
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
  getEpVersion: () => require('../../package.json').version,
  // checks if abiword is avaiable
  abiwordAvailable: () => {
    if (settings.abiword != null) {
      return os.type().indexOf('Windows') !== -1 ? 'withoutPDF' : 'yes';
    } else {
      return 'no';
    }
  },
  sofficeAvailable: () => {
    if (settings.soffice != null) {
      return os.type().indexOf('Windows') !== -1 ? 'withoutPDF' : 'yes';
    } else {
      return 'no';
    }
  },
  exportAvailable: () => {
    const abiword = settings.abiwordAvailable();
    const soffice = settings.sofficeAvailable();

    if (abiword === 'no' && soffice === 'no') {
      return 'no';
    } else if (
      (abiword === 'withoutPDF' && soffice === 'no') ||
      (abiword === 'no' && soffice === 'withoutPDF')
    ) {
      return 'withoutPDF';
    } else {
      return 'yes';
    }
  },
  // Provide git version if available
  getGitCommit: () => {
    let version = '';
    try {
      let rootPath = root;
      if (fs.lstatSync(`${rootPath}/.git`).isFile()) {
        rootPath = fs.readFileSync(`${rootPath}/.git`, 'utf8');
        rootPath = rootPath.split(' ').pop()!.trim();
      } else {
        rootPath += '/.git';
      }
      const ref = fs.readFileSync(`${rootPath}/HEAD`, 'utf-8');
      if (ref.startsWith('ref: ')) {
        const refPath = `${rootPath}/${ref.substring(5, ref.indexOf('\n'))}`;
        version = fs.readFileSync(refPath, 'utf-8');
      } else {
        version = ref;
      }
      version = version.substring(0, 7);
    } catch (e: any) {
      logger.warn(`Can't get git version for server header\n${e.message}`);
    }
    return version;
  },
  /**
   * Receives a settingsObj and, if the property name is a valid configuration
   * item, stores it in the module's exported properties via a side effect.
   *
   * This code refactors a previous version that copied & pasted the same code for
   * both "settings.json" and "credentials.json".
   */
  storeSettings: (settingsObj: SettingsObj) => {
    for (const i of Object.keys(settingsObj || {})) {
      if (nonSettings.includes(i)) {
        logger.warn(`Ignoring setting: '${i}'`);
        continue;
      }

      // test if the setting starts with a lowercase character
      if (i.charAt(0).search('[a-z]') !== 0) {
        logger.warn(`Settings should start with a lowercase character: '${i}'`);
      }

      // we know this setting, so we overwrite it,
      // or it's a settings hash, specific to a plugin
      // @ts-ignore
      if (settings[i] !== undefined || i.indexOf('ep_') === 0) {
        if (
          // @ts-ignore
          typeof settingsObj[i] == 'object' &&
          // @ts-ignore
          !Array.isArray(settingsObj[i])
        ) {
          // @ts-ignore
          if (settingsObj[i] !== undefined || settingsObj[i] !== null) {
            // @ts-ignore
            settings[i] = settingsObj[i];
          }
        } else {
          // @ts-ignore
          settings[i] = settingsObj[i];
        }
      } else {
        // this setting is unknown, output a warning and throw it away
        logger.warn(
          `Unknown Setting: '${i}'. This setting doesn't exist or it was removed`
        );
      }
    }
  },
  /*
   * If stringValue is a numeric string, or its value is "true" or "false", coerce
   * them to appropriate JS types. Otherwise return stringValue as-is.
   *
   * Please note that this function is used for converting types for default
   * values in the settings file (for example: "${PORT:9001}"), and that there is
   * no coercition for "null" values.
   *
   * If the user wants a variable to be null by default, he'll have to use the
   * short syntax "${ABIWORD}", and not "${ABIWORD:null}": the latter would result
   * in the literal string "null", instead.
   * */
  coerceValue: (stringValue: string) => {
    // cooked from https://stackoverflow.com/questions/175739/built-in-way-in-javascript-to-check-if-a-string-is-a-valid-number
    const isNumeric =
      !isNaN(Number(stringValue)) &&
      !isNaN(parseFloat(stringValue)) &&
      isFinite(Number(stringValue));

    if (isNumeric) {
      // detected numeric string. Coerce to a number

      return +stringValue;
    }

    switch (stringValue) {
      case 'true':
        return true;
      case 'false':
        return false;
      case 'undefined':
        return undefined;
      case 'null':
        return null;
      default:
        return stringValue;
    }
  },

  /**
   * Takes a javascript object containing Etherpad's configuration, and returns
   * another object, in which all the string properties whose value is of the form
   * "${ENV_VAR}" or "${ENV_VAR:default_value}" got their value replaced with the
   * contents of the given environment variable, or with a default value.
   *
   * By definition, an environment variable's value is always a string. However,
   * the code base makes use of the various json types. To maintain compatiblity,
   * some heuristics is applied:
   *
   * - if ENV_VAR does not exist in the environment, null is returned;
   * - if ENV_VAR's value is "true" or "false", it is converted to the js boolean
   *   values true or false;
   * - if ENV_VAR's value looks like a number, it is converted to a js number
   *   (details in the code).
   *
   * The following is a scheme of the behaviour of this function:
   *
   * +---------------------------+---------------+------------------+
   * | Configuration string in   | Value of      | Resulting confi- |
   * | settings.json             | ENV_VAR       | guration value   |
   * |---------------------------|---------------|------------------|
   * | "${ENV_VAR}"              | "some_string" | "some_string"    |
   * | "${ENV_VAR}"              | "9001"        | 9001             |
   * | "${ENV_VAR}"              | undefined     | null             |
   * | "${ENV_VAR:some_default}" | "some_string" | "some_string"    |
   * | "${ENV_VAR:some_default}" | undefined     | "some_default"   |
   * +---------------------------+---------------+------------------+
   *
   * IMPLEMENTATION NOTE: variable substitution is performed doing a round trip
   *     conversion to/from json, using a custom replacer parameter in
   *     JSON.stringify(), and parsing the JSON back again. This ensures that
   *     environment variable replacement is performed even on nested objects.
   *
   * see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#The_replacer_parameter
   */
  lookupEnvironmentVariables: (obj: object) => {
    const stringifiedAndReplaced = JSON.stringify(obj, (key, value) => {
      /*
       * the first invocation of replacer() is with an empty key. Just go on, or
       * we would zap the entire object.
       */
      if (key === '') {
        return value;
      }

      /*
       * If we received from the configuration file a number, a boolean or
       * something that is not a string, we can be sure that it was a literal
       * value. No need to perform any variable substitution.
       *
       * The environment variable expansion syntax "${ENV_VAR}" is just a string
       * of specific form, after all.
       */
      if (typeof value !== 'string') {
        return value;
      }

      /*
       * Let's check if the string value looks like a variable expansion (e.g.:
       * "${ENV_VAR}" or "${ENV_VAR:default_value}")
       */
      // MUXATOR 2019-03-21: we could use named capture groups here once we migrate to nodejs v10
      const match = value.match(/^\$\{([^:]*)(:((.|\n)*))?}$/);

      if (match == null) {
        // no match: use the value literally, without any substitution

        return value;
      }

      /*
       * We found the name of an environment variable. Let's read its actual value
       * and its default value, if given
       */
      const envVarName = match[1];
      const envVarValue = process.env[envVarName];
      const defaultValue = match[3];

      if (envVarValue === undefined && defaultValue === undefined) {
        logger.warn(
          `Environment variable "${envVarName}" does not contain any value for ` +
            `configuration key "${key}", and no default was given. Using null. ` +
            'THIS BEHAVIOR MAY CHANGE IN A FUTURE VERSION OF ETHERPAD; you should ' +
            'explicitly use "null" as the default if you want to continue to use null.'
        );

        /*
         * We have to return null, because if we just returned undefined, the
         * configuration item "key" would be stripped from the returned object.
         */
        return null;
      }

      if (envVarValue === undefined && defaultValue !== undefined) {
        logger.debug(
          `Environment variable "${envVarName}" not found for ` +
            `configuration key "${key}". Falling back to default value.`
        );

        return settings.coerceValue(defaultValue);
      }

      // envVarName contained some value.

      /*
       * For numeric and boolean strings let's convert it to proper types before
       * returning it, in order to maintain backward compatibility.
       */
      logger.debug(
        `Configuration key "${key}" will be read from environment variable "${envVarName}"`
      );

      return settings.coerceValue(envVarValue!);
    });

    return JSON.parse(stringifiedAndReplaced);
  },

  /**
   * - reads the JSON configuration file settingsFilename from disk
   * - strips the comments
   * - replaces environment variables calling lookupEnvironmentVariables()
   * - returns a parsed Javascript object
   *
   * The isSettings variable only controls the error logging.
   */
  parseSettings: (settingsFilename: string, isSettings: boolean) => {
    let settingsStr = '';

    let settingsType, notFoundMessage, notFoundFunction;

    if (isSettings) {
      settingsType = 'settings';
      notFoundMessage = 'Continuing using defaults!';
      notFoundFunction = logger.warn.bind(logger);
    } else {
      settingsType = 'credentials';
      notFoundMessage = 'Ignoring.';
      notFoundFunction = logger.info.bind(logger);
    }

    try {
      // read the settings file
      settingsStr = fs.readFileSync(settingsFilename).toString();
    } catch (e) {
      notFoundFunction(
        `No ${settingsType} file found in ${settingsFilename}. ${notFoundMessage}`
      );

      // or maybe undefined!
      return null;
    }

    try {
      settingsStr = minify(settingsStr).replace(',]', ']').replace(',}', '}');

      const settingsParsed = JSON.parse(settingsStr);

      logger.info(`${settingsType} loaded from: ${settingsFilename}`);

      return settings.lookupEnvironmentVariables(settingsParsed);
    } catch (e: any) {
      logger.error(
        `There was an error processing your ${settingsType} ` +
          `file from ${settingsFilename}: ${e.message}`
      );

      process.exit(1);
    }
  },
  reloadSettings: () => {
    const settingsParsed = settings.parseSettings(
      settings.settingsFilename,
      true
    );
    const credentials = settings.parseSettings(
      settings.credentialsFilename,
      false
    );
    settings.storeSettings(settingsParsed);
    settings.storeSettings(credentials);

    initLogging(settings.loglevel);

    if (settings.abiword) {
      // Check abiword actually exists
      fs.stat(settings.abiword, doesNotExist => {
        if (doesNotExist) {
          const abiwordError =
            'Abiword does not exist at this path, check your settings file.';
          if (!settings.suppressErrorsInPadText) {
            settings.defaultPadText += `\nError: ${abiwordError}${suppressDisableMsg}`;
          }
          logger.error(`${abiwordError} File location: ${settings.abiword}`);
          settings.abiword = null;
        }
      });
    }

    if (settings.soffice) {
      fs.stat(settings.soffice, doesNotExist => {
        if (doesNotExist) {
          const sofficeError =
            'soffice (libreoffice) does not exist at this path, check your settings file.';

          if (!settings.suppressErrorsInPadText) {
            settings.defaultPadText += `\nError: ${sofficeError}${suppressDisableMsg}`;
          }
          logger.error(`${sofficeError} File location: ${settings.soffice}`);
          settings.soffice = null;
        }
      });
    }

    if (settings.dbType === 'dirty') {
      const dirtyWarning =
        'DirtyDB is used. This is not recommended for production.';
      if (!settings.suppressErrorsInPadText) {
        settings.defaultPadText += `\nWarning: ${dirtyWarning}${suppressDisableMsg}`;
      }

      settings.dbSettings.filename = makeAbsolute(settings.dbSettings.filename);
      logger.warn(
        `${dirtyWarning} File location: ${settings.dbSettings.filename}`
      );
    }

    if (settings.ip === '') {
      // using Unix socket for connectivity
      logger.warn(
        'The settings file contains an empty string ("") for the "ip" parameter. The ' +
          '"port" parameter will be interpreted as the path to a Unix socket to bind at.'
      );
    }
    return settings;
  },
};

/* Root path of the installation */
logger.info(
  'All relative paths will be interpreted relative to the identified ' +
    `Etherpad base dir: ${root}`
);

export default settings;
