// node.js dependencies
const url = require('url');
const path = require('path');

// third-party dependencies
const { BrowserWindow } = require('electron');
const nativeImage = require('electron').nativeImage;
const app = require('electron').app;
const _ = require('lodash');

// internal dependencies
const { createEvent } = require('../common/model-event');
const devUrls = require('../common/constants/dev-urls.js');
const protocolUtils = require('../services/ProtocolUtils');
const { windowManager } = require('./windowManager');

const userPartitionService = require('./userPartitionService');
const userPartitionManager = require('./userPartitionManager');
const scratchPadPartitionService = require('./scratchPadPartitionService');

// constants
const AUTHORIZATION_RESPONSE_FIELDS = [
  'code',
  'state',
  'error',
  'error_description',
  'error_uri'
];
const CLIENT_AUTH_ACTION_AUTHORIZATION_GRANT = 'authorization_grant';
const PROTOCOL_NAME = protocolUtils.getProtocolName(app.getName());
const AUTH_NAMESPACE = `${PROTOCOL_NAME}://auth`;
const AUTHORIZATION_REDIRECTION_URI = `${AUTH_NAMESPACE}/callback`;

let ProtocolHandler;

module.exports = (() => {

  let htmlPath = path.resolve(__dirname, '..', 'html/auth');

  let config = {
    getAuthHTML: () => {
      let authUrl = process.env.PM_BUILD_ENV !== 'development' ?
                  url.format({ protocol: 'file', pathname: path.resolve(htmlPath, 'auth.html') }) :
                  devUrls.AUTH;

      return `${authUrl}?sessionId=${app.sessionId}&logPath=${app.logPath}`;
    },
    errorHTML: process.env.PM_BUILD_ENV !== 'development' ?
                  url.format({ protocol: 'file', pathname: path.resolve(htmlPath, 'error.html') }) :
                  devUrls.ERROR
  };

  let locals = {
    adapter: null,
    window: null,
    initiatedUserId: null,
    initiatedTeamId: null,

    // The URL of the page from where BBA (browser-based-auth) is initiated is stored here
    // Once BBA is completed and control is handed over to the app, this value is consumed to determine which page to load
    // NOTE: Only for desktop app usage
    continueUrl: null
  };

  let __initialized = false;

  const authEvents = (() => {

    /**
     * @description attach listeners in auth handler channel
     */
    function attachListeners () {
      pm.eventBus.channel('model-events')
      .subscribe((event = {}) => {
        if (event.namespace === 'users') {
          pm.logger.info(`Main - model-events~user - (${event.namespace}, ${event.name}) received`);
          if (event.name === 'add') {
            const isSignup = _.get(event, 'data.isSignup'),
              email = _.get(event, 'data.email'),
              hasAccounts = _.get(event, 'data.hasAccounts'),
              queryParams = _.get(event, 'data.queryParams', {});

              // saving the continueUrl to locals before BBA flow gets triggered
              locals.continueUrl = _.get(event, 'data.continueUrl');

            windowManager.closeRequesterWindows();
            return authWindow.open({ hasAccounts, isSignup, email, queryParams });
          }
          else if (event.name === 'switch') {
            let user = _.get(event, 'data');
            if (user) {
              const authResponse = {
                authData: {
                  userData: user,
                  additionalData: {
                    action: 'switch'
                  }
                }
              };
              return windowManager.reLaunchRequesterWindows({ authResponse });
            }
          }
          else if (event.name === 'addAndSwitch') {
            const authResponse = {
              authData: event.data
            };

            return windowManager.reLaunchRequesterWindows({ authResponse });
          }
        }
        else if (event.namespace === 'user') {
          pm.logger.info(`Main - model-events~user - (${event.namespace}, ${event.name}) received`);
          if (event.name === 'logout') {
            let user = _.get(event, 'data');

            if (user) {
              const authResponse = {
                authData: {
                  userData: user,
                  additionalData: {
                    action: 'logout'
                  }
                }
              };
              return windowManager.reLaunchRequesterWindows({ authResponse });
            }
          }
        }
      });

      pm.eventBus.channel('auth-handler-events')
      .subscribe((event = {}) => {
        pm.logger.info(`Main - model-events~user - (${event.namespace}, ${event.name}) received`);
        if (event.namespace === 'authentication') {
          if (event.name === 'reauthenticate') {
            const email = _.get(event, 'data.email'),
              userID = _.get(event, 'data.userID'),
              teamId = _.get(event, 'data.teamId', {}),
              expiredAccessToken = _.get(event, 'data.expiredAccessToken');

              windowManager.closeRequesterWindows();
            return authWindow.open({ hasAccounts: false, userID, teamId, email, expiredAccessToken });
          }
        }
      });
    }

    /**
     * @description sends the userinformation + handover token to shell
     *
     * @param {Object} data
     */
    function send (data) {
      locals.adapter.getAuthEventChannel().publish(createEvent('auth_response', 'authentication', data));
    }

    /**
     * @description initializes the sub module
     */
    function init () {
      attachListeners();
    }

    return { init, send };
  })();

  const authWindow = (() => {

    /**
     * @description attachListeners for browserWindow
     */
    function attachListeners () {
      locals.adapter.getAuthWindowChannel().subscribe((event) => {
        if (event.name !== 'response') return;

        /*
        * Data structure
        * {
        *   success: true,
        *   error: null,
        *   cancel: false,
        *   authData: {
        *     userData: {
        *       id: string,
        *       teamId: string,
        *       name: string,
        *       email: string,
        *       access_token: string
        *       handover_token: string
        *     },
        *     config: {},
        *     additionalData: {
        *       action: 'signup/login'
        *     }
        *   }
        * }
        */

        let responseData = event.data || {},

          // It is a locked session only if it is initiated from signed in user
          initiatedUserId = locals.initiatedUserId,
          initiatedTeamId = locals.initiatedTeamId,
          isLockedSession = initiatedUserId && initiatedUserId !== '0',
          authenticatedUserId = _.get(event, 'data.authData.userData.id'),
          authenticatedTeamId = _.get(event, 'data.authData.userData.teamId');


        const response = {
          authResponse: {
            authData: {
              additionalData: {
                action: 'skip'
              }
            }
          }
        };

        // adding continueUrl to additionalData to pass it down the control flow for consumption
        _.set(response, 'authResponse.authData.additionalData.continueUrl', locals.continueUrl);
        _.set(responseData, 'authData.additionalData.continueUrl', locals.continueUrl);

        if (responseData.cancel) {
          windowManager.openRequesterWindows(response);
        }

        /**
         * Cancel the authentication process if
         * 1. It was a locked session and
         * 2. The initiated user and team is not the one got authenticated.
         */
         else if (isLockedSession && !(initiatedUserId === authenticatedUserId && initiatedTeamId === authenticatedTeamId)) {

          // We are cancelling the auth which will take to the same revoked session user partition.
          windowManager.openRequesterWindows(response);
        } else {
          windowManager.openRequesterWindows({ authResponse: responseData });
        }

        // Close the authWindow
        destroy();

        // Sets default visibility of windows as visible.
        locals.adapter.setWindowsDefaultVisibilityState(true);

        // Show all other windows
        locals.adapter.showAllWindows();
      });
    }

    /**
     * @description opens the login window
     *
     * @param {Boolean} hasAccounts true, if user has logged into multiple accounts
     * @param {Boolean} isSignup true, if this is an signup attempt
     * @param {String} userID in case of re-authentication
     * @param {String} teamId in case of re-authentication
     * @param {String} email in case of re-authentication
     * @param {Object} queryParams - Consists of parameters such as UTM params
     */
    function open ({ hasAccounts, isSignup, userID, teamId, email, expiredAccessToken, queryParams = {} }) {
      // Sets default visibility of windows as hidden.
      locals.adapter.setWindowsDefaultVisibilityState(false);

      // Hide all other windows
      locals.adapter.hideAllWindows();

      if (locals.window) destroy();

      // We will use initiatedUserId to check if this is an reAuthentication attempt
      // and if initiated user and team is the one that got authenticated
      locals.initiatedUserId = userID;
      locals.initiatedTeamId = teamId;


      locals.window = new BrowserWindow({
        width: 1280,
        height: 900,
        title: 'Sign in to Postman',
        webPreferences: {
          nodeIntegration: true,
          partition: 'authentication',
          webviewTag: true,
          contextIsolation: false,
          preload: path.resolve(app.getAppPath(), 'preload/desktop/index.js')
         },
        icon: nativeImage.createFromPath(path.resolve(app.getAppPath(), 'assets/icon.png'))
      });

      require('@electron/remote/main').enable(locals.window.webContents);

      locals.window.loadURL(config.getAuthHTML());

      locals.window.webContents.on('dom-ready', () => {
        // From electron v11, there are some rendering issues with the chromium side which is affecting webview, browserViews and browserWindows.
        // This issue is only seen when there is a hidden window launched and another window is opened on top of it. In our case shared window is the hidden window
        // Adding a workaround for the issue with electron v11 where the auth window appears blank while launching the app.
        // Taking the focus away from auth window fixes the problem. This workaround needs to be put in when the content is ready. Similar issue is reported here https://github.com/electron/electron/issues/27353
        if (process.platform === 'win32') {
          locals.window.showInactive();
          locals.window.focus();
        }
        locals.window.webContents.setVisualZoomLevelLimits(1, 1);
      });

      locals.window.webContents.on('did-finish-load', () => {
        _.merge(queryParams, locals.adapter.getAppInfo(), locals.adapter.getSystemInfo(), { expiredAccessToken });

        ProtocolHandler.setDefaultProtocolClient()
        .then(ProtocolHandler.isDefaultProtocolClient)
        .then((result) => {
          if (result === true) {
            _.merge(queryParams, {
              redirect_uri: AUTHORIZATION_REDIRECTION_URI,
              action_type: CLIENT_AUTH_ACTION_AUTHORIZATION_GRANT
            });
          } else {
            pm.logger.warn('AuthHandler~open: Current app is not default protocol client - Falling back to polling mechanism.');
          }
        })
        .catch((e) => {
          pm.logger.warn(
            'AuthHandler~open: Error occurred while validating whether current app is default protocol client - Falling back to polling mechanism.', e
          );
        })
        .finally(() => {
          locals.adapter.getAuthWindowChannel().publish(createEvent('initialize', 'auth-window', {
            hasAccounts,
            isSignup,
            email,
            queryParams,
            errorHTML: config.errorHTML,
            userID,
            expiredAccessToken
          }));
        });
      });

      // Handle window closing
      locals.window.on('close', handleWindowClose);
    }

    /**
     * @description handle window close (intiated by user)
     */
    function handleWindowClose () {
      const response = {
        authResponse: {
          authData: {
            additionalData: {
              action: 'skip'
            }
          }
        }
      };

      windowManager.openRequesterWindows(response);

      // Sets default visibility state of windows as visible.
      locals.adapter.setWindowsDefaultVisibilityState(true);

      // Show all other windows
      locals.adapter.showAllWindows();

      locals.window = null;
    }

    /**
     * @description destroys the auth window
     */
    function destroy () {
      locals?.window?.destroy();
      locals.window = null;
    }

    /**
     * @description initializes the submodule
     */
    function init () {
      attachListeners();
    }

    /**
     * This function relays authorization response to auth window.
     * @param {Object} authorizationResponse
     */
    function relayAuthorizationResponse (authorizationResponse) {
      if (!locals.window) {
        pm.logger.warn('AuthHandler~relayAuthorizationResponse: Unable to relay authorization response - AuthWindow is not open.');

        // this event is published for the case when bba is happening without authWindow.
        // the listener for this event can be found in: src/scratchpad/onboarding/src/common/AuthCodeModal.js
        locals.adapter.getAuthWindowChannel()
          .publish(createEvent('authorization_response', 'auth-renderer', authorizationResponse));

        return;
      }

      locals.adapter.getAuthWindowChannel()
        .publish(createEvent('authorization_response', 'auth-window', authorizationResponse));
    }

    return { init, open, destroy, relayAuthorizationResponse };
  })();

  /**
   * @description initializes the authHandler service
   *
   * @param {Object} adapter
   */
  async function init (adapter = {}) {
    if (!adapter.getAuthEventChannel) throw new Error('Missing getAuthEventChannel, failed to initialize AuthHandler');
    if (!adapter.getAuthWindowChannel) throw new Error('Missing getAuthWindowChannel, failed to initialize AuthHandler');
    if (!adapter.showAllWindows) throw new Error('Missing showAllWindows, failed to initialize AuthHandler');
    if (!adapter.hideAllWindows) throw new Error('Missing hideAllWindows, failed to initialize AuthHandler');
    if (!adapter.setWindowsDefaultVisibilityState) throw new Error('Missing setWindowsDefaultVisibilityState, failed to initialize AuthHandler');
    if (!adapter.getAppInfo) throw new Error('Missing getAppInfo, failed to initialize AuthHandler');
    if (!adapter.getSystemInfo) throw new Error('Missing getSystemInfo, failed to initialize AuthHandler');

    locals.adapter = adapter;

    authEvents.init();
    authWindow.init();
    await userPartitionService.init();

    // Importing this inline to avoid cyclic dependency between protocol handler and auth handler.
    ProtocolHandler = require('../services/ProtocolHandler');

    __initialized = true;

    pm.sdk.IPC.handle('getLoggedInUsers', async () => {
      const allUserAccounts = await userPartitionService.getAllUsers();
      return allUserAccounts;
    });

    pm.sdk.IPC.subscribe('handleV7toV8Migration', async () => {
      const activePartitionId = await userPartitionService.getActivePartition(),
        isV8UserContextPartitionId = await userPartitionService.isV8UserContextPartitionId(activePartitionId),
        isV7UserContextPartitionId = await userPartitionService.isV7UserContextPartitionId(activePartitionId),
        isScratchPadPartitionId = await scratchPadPartitionService.isScratchPadPartitionId(activePartitionId);

      if ((isV7UserContextPartitionId && !isV8UserContextPartitionId) || isScratchPadPartitionId) {
        let ModelEventChannel = pm.eventBus.channel('model-events');
        ModelEventChannel.publish(createEvent('send-user-info', 'v8-partition-migration'));

        pm.logger.info('AuthHandler~requestTeamIdIfV7Partition: requesting user context from requester web view');
      }
    });

    pm.eventBus.channel('model-events').subscribe((events = {}) => {
      if (events.namespace === 'user') {
        if (events.name === 'bootstrapUser') {

          pm.logger.info(`model-events~user - ${events.name} received`);

          const updateEvent = _.find(events.events, ['name', 'bootstrappedUser']),
            user = _.get(updateEvent, 'data', null),
            oldUserContext = _.get(user, 'oldUserContext', null),
            newUserData = { ...user, teamId: _.get(user, ['organizations', '0', 'id']) || '0' };
          if (user && !_.isEmpty(oldUserContext) && !_.isEmpty(newUserData)) {
            return userPartitionManager.updateCurrentUserPartition(oldUserContext, newUserData);
          }
        }
      }

      if (events.namespace === 'v8-partition-migration') {
        if (events.name === 'user-info') {
          events.data && userPartitionManager.migrateV7User(events.data);
        }
      }
    });
  }

  /**
   * This function handles authorization redirect url.
   *
   * @param {String} url
   */
  function handleAuthorizationRedirectUrl (url) {
    let urlObject,
      urlSearchParams,
      authorizationResponse;

    pm.logger.info(`AuthHandler~handleAuthorizationRedirectUrl: Received authorization redirect url - ${url}`);

    try {
      urlObject = new URL(url),
      urlSearchParams = urlObject.searchParams;
    } catch (e) {
      pm.logger.error('AuthHandler~handleAuthorizationRedirectUrl: Unable to handle authorization redirect url.', e);

      return;
    }

    authorizationResponse = _.reduce(AUTHORIZATION_RESPONSE_FIELDS, (accumulator, current) => {
      let value = urlSearchParams.get(current);

      value && (accumulator[current] = value);

      return accumulator;
    }, {});

    return authWindow.relayAuthorizationResponse(authorizationResponse);
  }

  /**
   * This function handles all postman protocol urls that are under auth namespace.
   *
   * @param {String} url
   */
  function handleAuthUrl (url) {
    pm.logger.info(`AuthHandler~handleAuthUrl: Received auth url - ${url}`);

    // We won't proceed with handling auth urls if authHandler has not been initialized
    if (!isInitialized()) {
      pm.logger.warn('AuthHandler~handleAuthUrl: Unable to handle auth url - AuthHandler has not been initialized.');

      return;
    }

    if (!_.startsWith(url, AUTHORIZATION_REDIRECTION_URI)) { return; }

    return handleAuthorizationRedirectUrl(url);
  }

  /**
   * Returns boolean indicating whether AuthHandler is initialized.
   *
   * @returns {Boolean}
   */
  function isInitialized () {
    return __initialized;
  }

  return { init, isInitialized, handleAuthUrl };
})();
