import { io } from '@/backend/socketio';
import { AText, PadAuthor } from '@/types/PadType';
import {
  getAuthor,
  getAuthorColorId,
  getColorPalette,
  setAuthorName,
  setAuthorColorId, getAuthorName,
} from '@/service/pads/AuthorManager';
import { Socket } from 'socket.io';
import {
  ChangesetRequest, PadUserInfo,
  SocketClientRequest,
} from '@/types/SocketClientRequest';
import { settingsLoaded } from '@/server';
import { PLUGIN_HOOKS_INSTANCE } from '@/hooks/Hook';
import ChatMessage from '@/service/pads/ChatMessage';
import { padManagerInstance } from '@/service/pads/PadManager';
import assert from 'assert';
import { strict } from 'node:assert';
import { MapArrayType } from '@/types/MapArrayType';
import { ChangeSet } from '@/service/pads/ChangeSet';
import { makeSplice } from '@/utils/service/utilFuncs';
import { AttributeMap } from '@/service/pads/AttributeMap';
import AttributePool from '@/service/pads/AttributePool';
import { Pad } from '@/service/pads/Pad';
import { ChangeSetBuilder } from '@/service/pads/ChangeSetBuilder';
import { getIds } from '@/service/pads/ReadOnlyManager';
import { checkAccess } from '@/backend/session/SecurityManager';
import { userCanModify } from '@/backend/session/webAccess';
import { lineAttributes } from '@/backend/session/AttributeManager';
import checkValidRev from '@/utils/checkValidRev';

export const sessionInfosStore = new Map<string, any>;

/**
 * A changeset queue per pad that is processed by handleUserChanges()
 */
const padChannels = new Channels((ch, {socket, message}) => handleUserChanges(socket, message));


const addContextToError = (err:any, pfx:string) => {
  const newErr = new Error(`${pfx}${err.message}`, {cause: err});
  if (Error.captureStackTrace) Error.captureStackTrace(newErr, addContextToError);
  // Check for https://github.com/tc39/proposal-error-cause support, available in Node.js >= v16.10.
  if (newErr.cause === err) return newErr;
  err.message = `${pfx}${err.message}`;
  return err;
};

/**
 * Handles the connection of a new user
 * @param socket the socket.io Socket object for the new connection from the client
 */
export const handleConnect = (socket:Socket) => {
  console.debug(`[${socket.id}] Connected`);
  // Initialize sessioninfos for this new session
  sessionInfosStore.set(socket.id,{});
};


/**
 * Handles a USERINFO_UPDATE, that means that a user have changed his color or name.
 * Anyway, we get both informations
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleUserInfoUpdate = async (socket:Socket, {data: {userInfo: {name, colorId}}}: PadUserInfo) => {
  if (colorId == null) throw new Error('missing colorId');
  if (!name) name = null;
  const session = sessionInfosStore.get(socket.id);
  if (!session || !session.author || !session.padId) throw new Error('session not ready');
  const author = session.author;
  if (!/(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(colorId)) {
    throw new Error(`malformed color: ${colorId}`);
  }

  // Tell the authorManager about the new attributes
  const p = Promise.all([
    setAuthorColorId(author, colorId),
    setAuthorName(author, name!),
  ]);

  const padId = session.padId;

  const infoMsg = {
    type: 'COLLABROOM',
    data: {
      // The Client doesn't know about USERINFO_UPDATE, use USER_NEWINFO
      type: 'USER_NEWINFO',
      userInfo: {userId: author, name, colorId},
    },
  };

  // Send the other clients on the pad the update message
  socket.broadcast.to(padId).emit('message',infoMsg);

  // Block until the authorManager has stored the new attributes.
  await p;
};

const _getRoomSockets = (padID: string) => {
  const ns = io!.sockets; // Default namespace.
  // We could call adapter.clients(), but that method is unnecessarily asynchronous. Replicate what
  // it does here, but synchronously to avoid a race condition. This code will have to change when
  // we update to socket.io v3.
  const room = ns.adapter.rooms?.get(padID);

  if (!room) return [];

  return Array.from(room)
    .map(socketId => ns.sockets.get(socketId))
    .filter(socket => socket);
};


/**
 * Get the list of users in a pad
 */
export const padUsers = async (padID: string) => {
  const padUsers:PadAuthor[] = [];

  // iterate over all clients (in parallel)
  await Promise.all(_getRoomSockets(padID).map(async (roomSocket) => {
    const s = sessionInfosStore.get(roomSocket!.id);
    if (s) {
      const author = await getAuthor(s.author);
      // Fixes: https://github.com/ether/etherpad-lite/issues/4120
      // On restart author might not be populated?
      if (author) {
        author.id = s.author;
        padUsers.push(author);
      }
    }
  }));

  return {padUsers};
};


export const padUsersCount = (padID: string) => {
  return _getRoomSockets(padID).length;
};

export const kickSessionsFromPad = (padID: string) => {
  // Kick all sessions from the pad

  // skip if there is nobody on this pad
  if (_getRoomSockets(padID).length === 0) return;

  // disconnect everyone from this pad
  io?.sockets.in(padID).emit('message', {disconnect: 'deleted'});
};


/**
 * Handles the disconnection of a user
 * @param socket the socket.io Socket object for the client
 */
export const handleDisconnect = async (socket:Socket) => {
  const session = sessionInfosStore.get(socket.id);
  sessionInfosStore.delete(socket.id);
  // session.padId can be nullish if the user disconnects before sending CLIENT_READY.
  if (!session || !session.author || !session.padId) return;
  const {session: {user} = {}} = socket.client.request as unknown as SocketClientRequest;
  /* eslint-disable prefer-template -- it doesn't support breaking across multiple lines */
  console.log('[LEAVE]' +
    ` pad:${session.padId}` +
    ` socket:${socket.id}` +
    // @ts-ignore
    ` IP:${settingsLoaded.disableIPlogging ? 'ANONYMOUS' : socket.request.ip}` +
    ` authorID:${session.author}` +
    (user && user.username ? ` username:${user.username}` : ''));

  socket.broadcast.to(session.padId).emit('message', {
    type: 'COLLABROOM',
    data: {
      type: 'USER_LEAVE',
      userInfo: {
        colorId: await getAuthorColorId(session.author),
        userId: session.author,
      },
    },
  });

  PLUGIN_HOOKS_INSTANCE.callHook('userLeave', {
    ...session, // For backwards compatibility.
    authorId: session.author,
    readOnly: session.readonly,
    socket,
  });
};

/**
 * Handles a CLIENT_READY. A CLIENT_READY is the first message from the client
 * to the server. The Client sends his token
 * and the pad it wants to enter. The Server answers with the inital values (clientVars) of the pad
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleClientReady = async (socket:any, message: any) => {
  const sessionInfo = sessionInfosStore.get(socket!.id);
  if (sessionInfo == null) throw new Error('client disconnected');
  strict(sessionInfo.author);

  PLUGIN_HOOKS_INSTANCE.callHook('clientReady', message);

  let {colorId: authorColorId, name: authorName} = message.userInfo || {};
  if (authorColorId && !/^#(?:[0-9A-F]{3}){1,2}$/i.test(authorColorId)) {
    console.warn(`Ignoring invalid colorId in CLIENT_READY message: ${authorColorId}`);
    authorColorId = null;
  }
  await Promise.all([
    authorName && setAuthorName(sessionInfo.author, authorName),
    authorColorId && setAuthorColorId(sessionInfo.author, authorColorId),
  ]);
  ({colorId: authorColorId, name: authorName} = await getAuthor(sessionInfo.author));

  // load the pad-object from the database
  const pad = await padManagerInstance.getPad(sessionInfo.padId, null, sessionInfo.author);

  // these db requests all need the pad object (timestamp of latest revision, author data)
  const authors = pad.getAllAuthors();

  // get timestamp of latest revision needed for timeslider
  const currentTime = await pad.getRevisionDate(pad.headRevisionNumber);

  // get all author data out of the database (in parallel)
  const historicalAuthorData:MapArrayType<{
    name: string;
    colorId: string;
  }> = {};
  await Promise.all(authors.map(async (authorId: string) => {
    const author = await getAuthor(authorId);
    if (!author) {
      console.error(`There is no author for authorId: ${authorId}. ` +
        'This is possibly related to https://github.com/ether/etherpad-lite/issues/2802');
    } else {
      // Filter author attribs (e.g. don't send author's pads to all clients)
      historicalAuthorData[authorId] = {name: author.name, colorId: author.colorId};
    }
  }));

  // glue the clientVars together, send them and tell the other clients that a new one is there

  // Check if the user has disconnected during any of the above awaits.
  if (sessionInfo !== sessionInfosStore.get(socket!.id)) throw new Error('client disconnected');

  // Check if this author is already on the pad, if yes, kick the other sessions!
  const roomSockets = _getRoomSockets(pad.id);

  for (const otherSocket of roomSockets) {
    // The user shouldn't have joined the room yet, but check anyway just in case.
    if (otherSocket!.id === socket.id) continue;
    const sinfo = sessionInfosStore.get(otherSocket!.id);
    if (sinfo && sinfo.author === sessionInfo.author) {
      // fix user's counter, works on page refresh or if user closes browser window and then rejoins
      sessionInfosStore.set(otherSocket!.id, {});
      otherSocket!.leave(sessionInfo.padId);
      otherSocket!.emit('message', {disconnect: 'userdup'});
    }
  }

  const {session: {user} = {}} = socket.client.request as SocketClientRequest;
  /* eslint-disable prefer-template -- it doesn't support breaking across multiple lines */
  console.info(`[${pad.head > 0 ? 'ENTER' : 'CREATE'}]` +
    ` pad:${sessionInfo.padId}` +
    ` socket:${socket.id}` +
    ` IP:${settingsLoaded.disableIPlogging ? 'ANONYMOUS' : socket.request.ip}` +
    ` authorID:${sessionInfo.author}` +
    (user && user.username ? ` username:${user.username}` : ''));
  /* eslint-enable prefer-template */

  if (message.reconnect) {
    // If this is a reconnect, we don't have to send the client the ClientVars again
    // Join the pad and start receiving updates
    socket.join(sessionInfo.padId);

    // Save the revision in sessioninfos, we take the revision from the info the client send to us
    sessionInfo.rev = message.client_rev;

    // During the client reconnect, client might miss some revisions from other clients.
    // By using client revision,
    // this below code sends all the revisions missed during the client reconnect
    const revisionsNeeded = [];
    const changesets:MapArrayType<any> = {};

    let startNum = message.client_rev + 1;
    let endNum = pad.headRevisionNumber + 1;

    const headNum = pad.headRevisionNumber;

    if (endNum > headNum + 1) {
      endNum = headNum + 1;
    }

    if (startNum < 0) {
      startNum = 0;
    }

    for (let r = startNum; r < endNum; r++) {
      revisionsNeeded.push(r);
      changesets[r] = {};
    }

    await Promise.all(revisionsNeeded.map(async (revNum) => {
      const cs = changesets[revNum];
      [cs.changeset, cs.author, cs.timestamp] = await Promise.all([
        pad.getRevisionChangeset(revNum),
        pad.getRevisionAuthor(revNum),
        pad.getRevisionDate(revNum),
      ]);
    }));

    // return pending changesets
    for (const r of revisionsNeeded) {
      const forWire = ChangeSet.prepareForWire(changesets[r].changeset, pad.pool);
      const wireMsg = {type: 'COLLABROOM',
        data: {type: 'CLIENT_RECONNECT',
          headRev: pad.headRevisionNumber,
          newRev: r,
          changeset: forWire.translated,
          apool: forWire.pool,
          author: changesets[r].author,
          currentTime: changesets[r].timestamp}};
      socket.emit('message', wireMsg);
    }

    if (startNum === endNum) {
      const Msg = {type: 'COLLABROOM',
        data: {type: 'CLIENT_RECONNECT',
          noChanges: true,
          newRev: pad.headRevisionNumber}};
      socket.emit('message', Msg);
    }
  } else {
    // This is a normal first connect
    let atext;
    let apool;
    // prepare all values for the wire, there's a chance that this throws, if the pad is corrupted
    try {
      atext = ChangeSet.cloneAText(pad.atext);
      const attribsForWire = ChangeSet.prepareForWire(atext.attribs, pad.pool);
      apool = attribsForWire.pool.toJsonable();
      atext.attribs = attribsForWire.translated;
    } catch (e:any) {
      console.error(e.stack || e);
      socket.emit('message', {disconnect: 'corruptPad'}); // pull the brakes
      throw new Error('corrupt pad');
    }

    // Warning: never ever send sessionInfo.padId to the client. If the client is read only you
    // would open a security hole 1 swedish mile wide...
    const clientVars:MapArrayType<any> = {
      skinName: settingsLoaded.skinName,
      skinVariants: settingsLoaded.skinVariants,
      accountPrivs: {
        maxRevisions: 100,
      },
      automaticReconnectionTimeout: settingsLoaded.automaticReconnectionTimeout,
      initialRevisionList: [],
      initialOptions: {},
      savedRevisions: pad.getSavedRevisions(),
      collab_client_vars: {
        initialAttributedText: atext,
        clientIp: '127.0.0.1',
        padId: sessionInfo.auth.padID,
        historicalAuthorData,
        apool,
        rev: pad.headRevisionNumber,
        time: currentTime,
      },
      socketTransportProtocols: settingsLoaded.socketTransportProtocols,
      colorPalette: getColorPalette(),
      clientIp: '127.0.0.1',
      userColor: authorColorId,
      padId: sessionInfo.auth.padID,
      padOptions: settingsLoaded.padOptions,
      padShortcutEnabled: settingsLoaded.padShortcutEnabled,
      initialTitle: `Pad: ${sessionInfo.auth.padID}`,
      opts: {},
      // tell the client the number of the latest chat-message, which will be
      // used to request the latest 100 chat-messages later (GET_CHAT_MESSAGES)
      chatHead: pad.chatHead,
      numConnectedUsers: roomSockets.length,
      readOnlyId: sessionInfo.readOnlyPadId,
      readonly: sessionInfo.readonly,
      serverTimestamp: Date.now(),
      sessionRefreshInterval: settingsLoaded.cookie.sessionRefreshInterval,
      userId: sessionInfo.author,
      abiwordAvailable: settingsLoaded.abiwordAvailable(),
      sofficeAvailable: settingsLoaded.sofficeAvailable(),
      exportAvailable: settingsLoaded.exportAvailable(),
      indentationOnNewLine: settingsLoaded.indentationOnNewLine,
      scrollWhenFocusLineIsOutOfViewport: {
        percentage: {
          editionAboveViewport:
          settingsLoaded.scrollWhenFocusLineIsOutOfViewport.percentage.editionAboveViewport,
          editionBelowViewport:
          settingsLoaded.scrollWhenFocusLineIsOutOfViewport.percentage.editionBelowViewport,
        },
        duration: settingsLoaded.scrollWhenFocusLineIsOutOfViewport.duration,
        scrollWhenCaretIsInTheLastLineOfViewport:
        settingsLoaded.scrollWhenFocusLineIsOutOfViewport.scrollWhenCaretIsInTheLastLineOfViewport,
        percentageToScrollWhenUserPressesArrowUp:
        settingsLoaded.scrollWhenFocusLineIsOutOfViewport.percentageToScrollWhenUserPressesArrowUp,
      },
      initialChangesets: [], // FIXME: REMOVE THIS SHIT
    };

    // Add a username to the clientVars if one avaiable
    if (authorName != null) {
      clientVars.userName = authorName;
    }

    // call the clientVars-hook so plugins can modify them before they get sent to the client
    PLUGIN_HOOKS_INSTANCE.callHook('clientVars', {clientVars, pad, socket});

    // Join the pad and start receiving updates
    socket.join(sessionInfo.padId);

    // Send the clientVars to the Client
    socket.emit('message', {type: 'CLIENT_VARS', data: clientVars});

    // Save the current revision in sessioninfos, should be the same as in clientVars
    sessionInfo.rev = pad.headRevisionNumber;
  }

  // Notify other users about this new user.
  socket.broadcast.to(sessionInfo.padId).emit('message', {
    type: 'COLLABROOM',
    data: {
      type: 'USER_NEWINFO',
      userInfo: {
        colorId: authorColorId,
        name: authorName,
        userId: sessionInfo.author,
      },
    },
  });

  // Notify this new user about other users.
  await Promise.all(_getRoomSockets(pad.id).map(async (roomSocket) => {
    if (roomSocket!.id === socket.id) return;

    // sessioninfos might change while enumerating, so check if the sessionID is still assigned to a
    // valid session.
    const sessionInfo = sessionInfosStore.get(roomSocket!.id);
    if (sessionInfo == null) return;

    // get the authorname & colorId
    const authorId = sessionInfo.author;
    // The authorId of this other user might be unknown if the other user just connected and has
    // not yet sent a CLIENT_READY message.
    if (authorId == null) return;

    // reuse previously created cache of author's data
    const authorInfo = historicalAuthorData[authorId] || await getAuthor(authorId);
    if (authorInfo == null) {
      console.error(
        `Author ${authorId} connected via socket.io session ${roomSocket!.id} is missing from ` +
        'the global author database. This should never happen because the author ID is ' +
        'generated by the same code that adds the author to the database.');
      // Don't bother telling the new user about this mystery author.
      return;
    }

    const msg = {
      type: 'COLLABROOM',
      data: {
        type: 'USER_NEWINFO',
        userInfo: {
          colorId: authorInfo.colorId,
          name: authorInfo.name,
          userId: authorId,
        },
      },
    };

    socket.emit('message', msg);
  }));


  PLUGIN_HOOKS_INSTANCE.callHook('userJoin', {
    authorId: sessionInfo.author,
    displayName: authorName,
    padId: sessionInfo.padId,
    readOnly: sessionInfo.readonly,
    readOnlyPadId: sessionInfo.readOnlyPadId,
    socket,
  });
};

/**
 * Tries to rebuild the getPadLines function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L263
 */
const getPadLines = async (pad: Pad, revNum: number) => {
  // get the atext
  let atext;

  if (revNum >= 0) {
    atext = await pad.getInternalRevisionAText(revNum);
  } else {
    atext = ChangeSet.makeAText('\n');
  }

  return {
    textlines: ChangeSet.splitTextLines(atext.text),
    alines: ChangeSet.splitAttributionLines(atext.attribs, atext.text),
  };
};

/**
 * Tries to rebuild the getChangestInfo function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L144
 */
const getChangesetInfo = async (pad: Pad, startNum: number, endNum:number, granularity: number) => {
  const headRevision = pad.headRevisionNumber;

  // calculate the last full endnum
  if (endNum > headRevision + 1) endNum = headRevision + 1;
  endNum = Math.floor(endNum / granularity) * granularity;

  const compositesChangesetNeeded = [];
  const revTimesNeeded = [];

  // figure out which composite Changeset and revTimes we need, to load them in bulk
  for (let start = startNum; start < endNum; start += granularity) {
    const end = start + granularity;

    // add the composite Changeset we needed
    compositesChangesetNeeded.push({start, end});

    // add the t1 time we need
    revTimesNeeded.push(start === 0 ? 0 : start - 1);

    // add the t2 time we need
    revTimesNeeded.push(end - 1);
  }

  // Get all needed db values in parallel.
  const composedChangesets:MapArrayType<any> = {};
  const revisionDate:number[] = [];
  const [lines] = await Promise.all([
    getPadLines(pad, startNum - 1),
    // Get all needed composite Changesets.
    ...compositesChangesetNeeded.map(async (item) => {
      const changeset = await composePadChangesets(pad, item.start, item.end);
      composedChangesets[`${item.start}/${item.end}`] = changeset;
    }),
    // Get all needed revision Dates.
    ...revTimesNeeded.map(async (revNum) => {
      const revDate = await pad.getRevisionDate(revNum);
      revisionDate[revNum] = Math.floor(revDate / 1000);
    }),
  ]);

  // doesn't know what happens here exactly :/
  const timeDeltas = [];
  const forwardsChangesets = [];
  const backwardsChangesets = [];
  const apool = new AttributePool();

  for (let compositeStart = startNum; compositeStart < endNum; compositeStart += granularity) {
    const compositeEnd = compositeStart + granularity;
    if (compositeEnd > endNum || compositeEnd > headRevision + 1) break;

    const forwards = composedChangesets[`${compositeStart}/${compositeEnd}`];
    const backwards = ChangeSet.inverse(forwards, lines.textlines, lines.alines, pad.apool);

    ChangeSet.mutateAttributionLines(forwards, lines.alines, pad.apool);
    ChangeSet.mutateTextLines(forwards, lines.textlines);

    const forwards2 = ChangeSet.moveOpsToNewPool(forwards, pad.apool, apool);
    const backwards2 = ChangeSet.moveOpsToNewPool(backwards, pad.apool, apool);

    const t1 = (compositeStart === 0) ? revisionDate[0] : revisionDate[compositeStart - 1];
    const t2 = revisionDate[compositeEnd - 1];

    timeDeltas.push(t2 - t1);
    forwardsChangesets.push(forwards2);
    backwardsChangesets.push(backwards2);
  }

  return {forwardsChangesets, backwardsChangesets,
    apool: apool.toJsonable(), actualEndNum: endNum,
    timeDeltas, start: startNum, granularity};
};


/**
 * Tries to rebuild the composePadChangeset function of the original Etherpad
 * https://github.com/ether/pad/blob/master/etherpad/src/etherpad/control/pad/pad_changeset_control.js#L241
 */
const composePadChangesets = async (pad: Pad, startNum: number, endNum: number) => {
  // fetch all changesets we need
  const headNum = pad.headRevisionNumber;
  endNum = Math.min(endNum, headNum + 1);
  startNum = Math.max(startNum, 0);

  // create an array for all changesets, we will
  // replace the values with the changeset later
  const changesetsNeeded = [];
  for (let r = startNum; r < endNum; r++) {
    changesetsNeeded.push(r);
  }

  // get all changesets
  const changesets:MapArrayType<string> = {};
  await Promise.all(changesetsNeeded.map(
    (revNum) => pad.getRevisionChangeset(revNum)
      .then((changeset) => changesets[revNum] = changeset)));

  // compose Changesets
  let r;
  try {
    let changeset = changesets[startNum];
    const pool = pad.apool;

    for (r = startNum + 1; r < endNum; r++) {
      const cs = changesets[r];
      changeset = ChangeSet.compose(changeset, cs, pool);
    }
    return changeset;
  } catch (e) {
    // r-1 indicates the rev that was build starting with startNum, applying startNum+1, +2, +3
    console.warn(
      `failed to compose cs in pad: ${pad.id} startrev: ${startNum} current rev: ${r}`);
    throw e;
  }
};


/**
 * Handles a request for a rough changeset, the timeslider client needs it
 */
const handleChangesetRequest = async (socket:any, {data: {granularity, start, requestID}}: ChangesetRequest) => {
  if (granularity == null) throw new Error('missing granularity');
  if (!Number.isInteger(granularity)) throw new Error('granularity is not an integer');
  if (start == null) throw new Error('missing start');
  start = checkValidRev(start);
  if (requestID == null) throw new Error('mising requestID');
  const end = start + (100 * granularity);
  const {padId, author: authorId} = sessionInfosStore.get(socket.id);
  const pad = await padManagerInstance.getPad(padId, null, authorId);
  const headRev = pad.headRevisionNumber;
  if (start > headRev)
    start = headRev;
  const data:MapArrayType<any> = await getChangesetInfo(pad, start, end, granularity);
  data.requestID = requestID;
  socket.emit('message', {type: 'CHANGESET_REQ', data});
};

/**
 * Handles a message from a user
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
export const handleMessage = async (socket:any, message: any) => {
  const env = process.env.NODE_ENV || 'development';

  if (message == null) throw new Error('message is null');
  if (!message.type) throw new Error('message type missing');

  const thisSession = sessionInfosStore.get(socket.id);
  if (!thisSession) throw new Error('message from an unknown connection');

  if (message.type === 'CLIENT_READY') {
    // Remember this information since we won't have the cookie in further socket.io messages. This
    // information will be used to check if the sessionId of this connection is still valid since it
    // could have been deleted by the API.
    thisSession.auth = {
      sessionID: message.sessionID,
      padID: message.padId,
      token: message.token,
    };

    // Pad does not exist, so we need to sanitize the id
    if (!(await padManagerInstance.doesPadExist(thisSession.auth.padID))) {
      thisSession.auth.padID = await padManagerInstance.sanitizePadId(thisSession.auth.padID);
    }
    const padIds = await getIds(thisSession.auth.padID);
    thisSession.padId = padIds.padId;
    thisSession.readOnlyPadId = padIds.readOnlyPadId;
    thisSession.readonly =
      padIds.readonly || !userCanModify(thisSession.auth.padID, socket.client.request);
  }
  // Outside of the checks done by this function, message.padId must not be accessed because it is
  // too easy to introduce a security vulnerability that allows malicious users to read or modify
  // pads that they should not be able to access. Code should instead use
  // sessioninfos[socket.id].padId if the real pad ID is needed or
  // sessioninfos[socket.id].auth.padID if the original user-supplied pad ID is needed.
  Object.defineProperty(message, 'padId', {get: () => {
      throw new Error('message.padId must not be accessed (for security reasons)');
    }});

  const auth = thisSession.auth;
  if (!auth) {
    const ip = settingsLoaded.disableIPlogging ? 'ANONYMOUS' : (socket.request.ip || '<unknown>');
    const msg = JSON.stringify(message, null, 2);
    throw new Error(`pre-CLIENT_READY message from IP ${ip}: ${msg}`);
  }

  const {session: {user} = {}} = socket.client.request as SocketClientRequest;
  const {accessStatus, authorID} =
    await checkAccess(auth.padID, auth.sessionID, auth.token, user);
  if (accessStatus !== 'grant') {
    socket.emit('message', {accessStatus});
    throw new Error('access denied');
  }
  if (thisSession.author != null && thisSession.author !== authorID) {
    socket.emit('message', {disconnect: 'rejected'});
    throw new Error([
      'Author ID changed mid-session. Bad or missing token or sessionID?',
      `socket:${socket.id}`,
      `IP:${settingsLoaded.disableIPlogging ? 'ANONYMOUS' : socket.request.ip}`,
      `originalAuthorID:${thisSession.author}`,
      `newAuthorID:${authorID}`,
      ...(user && user.username) ? [`username:${user.username}`] : [],
      `message:${message}`,
    ].join(' '));
  }
  thisSession.author = authorID;

  // Allow plugins to bypass the readonly message blocker
  let readOnly = thisSession.readonly;
  const context = {
    message,
    sessionInfo: {
      authorId: thisSession.author,
      padId: thisSession.padId,
      readOnly: thisSession.readonly,
    },
    socket,
  };

  // Drop the message if the client disconnected during the above processing.
  if (sessionInfosStore.get(socket.id) !== thisSession) throw new Error('client disconnected');

  const {type} = message;
  try {
    switch (type) {
      case 'CLIENT_READY': await handleClientReady(socket, message); break;
      case 'CHANGESET_REQ': await handleChangesetRequest(socket, message); break;
      case 'COLLABROOM': {
        if (readOnly) throw new Error('write attempt on read-only pad');
        const {type} = message.data;
        try {
          switch (type) {
            case 'USER_CHANGES':
              await padChannels.enqueue(thisSession.padId, {socket, message});
              break;
            case 'USERINFO_UPDATE': await handleUserInfoUpdate(socket, message); break;
            case 'CHAT_MESSAGE': await handleChatMessage(socket, message); break;
            case 'GET_CHAT_MESSAGES': await handleGetChatMessages(socket, message); break;
            case 'SAVE_REVISION': await handleSaveRevisionMessage(socket, message); break;
            case 'CLIENT_MESSAGE': {
              const {type} = message.data.payload;
              try {
                switch (type) {
                  case 'suggestUserName': handleSuggestUserName(socket, message); break;
                  default: throw new Error('unknown message type');
                }
              } catch (err) {
                throw addContextToError(err, `${type}: `);
              }
              break;
            }
            default: throw new Error('unknown message type');
          }
        } catch (err) {
          throw addContextToError(err, `${type}: `);
        }
        break;
      }
      default: throw new Error('unknown message type');
    }
  } catch (err) {
    throw addContextToError(err, `${type}: `);
  }
};

const updatePadClients = async (pad: Pad) => {
  // skip this if no-one is on this pad
  const roomSockets = _getRoomSockets(pad.id);
  if (roomSockets.length === 0) return;

  // since all clients usually get the same set of changesets, store them in local cache
  // to remove unnecessary roundtrip to the datalayer
  // NB: note below possibly now accommodated via the change to promises/async
  // TODO: in REAL world, if we're working without datalayer cache,
  // all requests to revisions will be fired
  // BEFORE first result will be landed to our cache object.
  // The solution is to replace parallel processing
  // via async.forEach with sequential for() loop. There is no real
  // benefits of running this in parallel,
  // but benefit of reusing cached revision object is HUGE
  const revCache:MapArrayType<any> = {};

  await Promise.all(roomSockets.map(async (socket) => {
    const sessioninfo = sessionInfosStore.get(socket!.id);
    // The user might have disconnected since _getRoomSockets() was called.
    if (sessioninfo == null) return;

    while (sessioninfo.rev < pad.headRevisionNumber) {
      const r = sessioninfo.rev + 1;
      let revision = revCache[r];
      if (!revision) {
        revision = await pad.getRevision(r);
        revCache[r] = revision;
      }

      const author = revision.meta.author;
      const revChangeset = revision.changeset;
      const currentTime = revision.meta.timestamp;

      const forWire = ChangeSet.prepareForWire(revChangeset, pad.pool);
      const msg = {
        type: 'COLLABROOM',
        data: {
          type: 'NEW_CHANGES',
          newRev: r,
          changeset: forWire.translated,
          apool: forWire.pool,
          author,
          currentTime,
          timeDelta: currentTime - sessioninfo.time,
        },
      };
      try {
        socket!.emit('message', msg);
      } catch (err:any) {
        console.error(`Failed to notify user of new revision: ${err.stack || err}`);
        return;
      }
      sessioninfo.time = currentTime;
      sessioninfo.rev = r;
    }
  }));
};

const handleUserChanges = async (socket:any, message: any) => {

  // The client might disconnect between our callbacks. We should still
  // finish processing the changeset, so keep a reference to the session.
  const thisSession = sessionInfosStore.get(socket.id);

  // TODO: this might happen with other messages too => find one place to copy the session
  // and always use the copy. atm a message will be ignored if the session is gone even
  // if the session was valid when the message arrived in the first place
  if (!thisSession) throw new Error('client disconnected');

  try {
    const {data: {baseRev, apool, changeset}} = message;
    if (baseRev == null) throw new Error('missing baseRev');
    if (apool == null) throw new Error('missing apool');
    if (changeset == null) throw new Error('missing changeset');
    const wireApool = (new AttributePool()).fromJsonable(apool);
    const pad = await padManagerInstance.getPad(thisSession.padId, null, thisSession.author);

    // Verify that the changeset has valid syntax and is in canonical form
    ChangeSet.checkRep(changeset);

    // Validate all added 'author' attribs to be the same value as the current user
    for (const op of ChangeSet.deserializeOps(ChangeSet.unpack(changeset).ops)) {
      // + can add text with attribs
      // = can change or add attribs
      // - can have attribs, but they are discarded and don't show up in the attribs -
      // but do show up in the pool

      // Besides verifying the author attribute, this serves a second purpose:
      // AttributeMap.fromString() ensures that all attribute numbers are valid (it will throw if
      // an attribute number isn't in the pool).
      const opAuthorId = AttributeMap.fromString(op.attribs, wireApool).get('author');
      if (opAuthorId && opAuthorId !== thisSession.author) {
        throw new Error(`Author ${thisSession.author} tried to submit changes as author ` +
          `${opAuthorId} in changeset ${changeset}`);
      }
    }

    // ex. adoptChangesetAttribs

    // Afaik, it copies the new attributes from the changeset, to the global Attribute Pool
    let rebasedChangeset = ChangeSet.moveOpsToNewPool(changeset, wireApool, pad.pool);

    // ex. applyUserChanges
    let r = baseRev;

    // The client's changeset might not be based on the latest revision,
    // since other clients are sending changes at the same time.
    // Update the changeset so that it can be applied to the latest revision.
    while (r < pad.headRevisionNumber) {
      r++;
      const {changeset: c, meta: {author: authorId}} = await pad.getRevision(r);
      if (changeset === c && thisSession.author === authorId) {
        // Assume this is a retransmission of an already applied changeset.
        rebasedChangeset = ChangeSet.identity(ChangeSet.unpack(changeset).oldLen);
      }
      // At this point, both "c" (from the pad) and "changeset" (from the
      // client) are relative to revision r - 1. The follow function
      // rebases "changeset" so that it is relative to revision r
      // and can be applied after "c".
      rebasedChangeset = ChangeSet.follow(c, rebasedChangeset, false, pad.pool);
    }

    const prevText = pad.text();

    if (ChangeSet.oldLen(rebasedChangeset) !== prevText.length) {
      throw new Error(
        `Can't apply changeset ${rebasedChangeset} with oldLen ` +
        `${ChangeSet.oldLen(rebasedChangeset)} to document of length ${prevText.length}`);
    }

    const newRev = await pad.appendRevision(rebasedChangeset, thisSession.author);
    // The head revision will either stay the same or increase by 1 depending on whether the
    // changeset has a net effect.
    assert([r, r + 1].includes(newRev));

    const correctionChangeset = _correctMarkersInPad(pad.atext, pad.pool);
    if (correctionChangeset) {
      await pad.appendRevision(correctionChangeset, thisSession.author);
    }

    // Make sure the pad always ends with an empty line.
    if (pad.text().lastIndexOf('\n') !== pad.text().length - 1) {
      const nlChangeset = makeSplice(pad.text(), pad.text().length - 1, 0, '\n');
      await pad.appendRevision(nlChangeset, thisSession.author);
    }

    // The client assumes that ACCEPT_COMMIT and NEW_CHANGES messages arrive in order. Make sure we
    // have already sent any previous ACCEPT_COMMIT and NEW_CHANGES messages.
    assert.equal(thisSession.rev, r);
    socket.emit('message', {type: 'COLLABROOM', data: {type: 'ACCEPT_COMMIT', newRev}});
    thisSession.rev = newRev;
    if (newRev !== r) thisSession.time = await pad.getRevisionDate(newRev);
    await updatePadClients(pad);
  } catch (err:any) {
    socket.emit('message', {disconnect: 'badChangeset'});
    console.warn(`Failed to apply USER_CHANGES from author ${thisSession.author} ` +
      `(socket ${socket.id}) on pad ${thisSession.padId}: ${err.stack || err}`);
  }
};



/**
 * Copied from the Etherpad Source Code. Don't know what this method does excatly...
 */
const _correctMarkersInPad = (atext: AText, apool: AttributePool) => {
  const text = atext.text;

  // collect char positions of line markers (e.g. bullets) in new atext
  // that aren't at the start of a line
  const badMarkers = [];
  let offset = 0;
  for (const op of ChangeSet.deserializeOps(atext.attribs)) {
    const attribs = AttributeMap.fromString(op.attribs, apool);
    const hasMarker = lineAttributes.some((a: string) => attribs.has(a));
    if (hasMarker) {
      for (let i = 0; i < op.chars; i++) {
        if (offset > 0 && text.charAt(offset - 1) !== '\n') {
          badMarkers.push(offset);
        }
        offset++;
      }
    } else {
      offset += op.chars;
    }
  }

  if (badMarkers.length === 0) {
    return null;
  }

  // create changeset that removes these bad markers
  offset = 0;

  const builder = new ChangeSetBuilder(text.length);

  badMarkers.forEach((pos) => {
    builder.keepText(text.substring(offset, pos));
    builder.remove(1);
    offset = pos + 1;
  });

  return builder.toString();
};


/**
 * Handles a handleSuggestUserName, that means a user have suggest a userName for a other user
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleSuggestUserName = (socket:any, message: any) => {
  const {newName, unnamedId} = message.data.payload;
  if (newName == null) throw new Error('missing newName');
  if (unnamedId == null) throw new Error('missing unnamedId');
  const padId = sessionInfosStore.get(socket!.id).padId;
  // search the author and send him this message
  _getRoomSockets(padId).forEach((socket) => {
    const session = sessionInfosStore.get(socket!.id);
    if (session && session.author === unnamedId) {
      socket!.emit('message', message);
    }
  });
};

/**
 * Handles a save revision message
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleSaveRevisionMessage = async (socket:any, message: string) => {
  const {padId, author: authorId} = sessionInfosStore.get(socket!.id);
  const pad = await padManagerInstance.getPad(padId, null, authorId);
  await pad.addSavedRevision(pad.head, authorId);
};

/**
 * Handles the clients request for more chat-messages
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleGetChatMessages = async (socket:any, {data: {start, end}}:any) => {
  if (!Number.isInteger(start)) throw new Error(`missing or invalid start: ${start}`);
  if (!Number.isInteger(end)) throw new Error(`missing or invalid end: ${end}`);
  const count = end - start;
  if (count < 0 || count > 100) throw new Error(`invalid number of messages: ${count}`);
  const {padId, author: authorId} = sessionInfosStore.get(socket!.id);
  const pad = await padManagerInstance.getPad(padId, null, authorId);

  const chatMessages = await pad.getChatMessages(start, end);
  const infoMsg = {
    type: 'COLLABROOM',
    data: {
      type: 'CHAT_MESSAGES',
      messages: chatMessages,
    },
  };

  // send the messages back to the client
  socket.emit('message', infoMsg);
};


/**
 * Handles a Chat Message
 * @param socket the socket.io Socket object for the client
 * @param message the message from the client
 */
const handleChatMessage = async (socket:any, message: any) => {
  const chatMessage = ChatMessage.fromObject(message.data.message);
  const {padId, author: authorId} = sessionInfosStore.get(socket!.id);
  // Don't trust the user-supplied values.
  chatMessage.time = Date.now();
  chatMessage.authorId = authorId;
  await sendChatMessageToPadClients(chatMessage, padId);
};

/**
 * Adds a new chat message to a pad and sends it to connected clients.
 *
 * @param {(ChatMessage|number)} mt - Either a chat message object (recommended) or the timestamp of
 *     the chat message in ms since epoch (deprecated).
 * @param {string} puId - If `mt` is a chat message object, this is the destination pad ID.
 *     Otherwise, this is the user's author ID (deprecated).
 * @param {string} [text] - The text of the chat message. Deprecated; use `mt.text` instead.
 * @param {string} [padId] - The destination pad ID. Deprecated; pass a chat message
 *     object as the first argument and the destination pad ID as the second argument instead.
 */
export const sendChatMessageToPadClients = async (mt: ChatMessage|number, puId: string, text:string|null = null, padId:string|null = null) => {
  const message = mt instanceof ChatMessage ? mt : new ChatMessage(text, puId, mt as number);
  padId = mt instanceof ChatMessage ? puId : padId;
  const pad = await padManagerInstance.getPad(padId!, null, message.authorId!);

  // pad.appendChatMessage() ignores the displayName property so we don't need to wait for
  // authorManager.getAuthorName() to resolve before saving the message to the database.
  const promise = pad.appendChatMessage(message);
  message.displayName = await getAuthorName(message.authorId!);
  io!.sockets.in(padId!).emit('message', {
    type: 'COLLABROOM',
    data: {type: 'CHAT_MESSAGE', message},
  });
  await promise;
};
