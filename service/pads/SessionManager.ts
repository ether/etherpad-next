import { firstSatisfies } from '@/utils/service/promises';
import { db } from '@/backend/DB';
import CustomError from '@/utils/service/CustomError';
import { isInt, randomString } from '@/utils/service/utilFuncs';
import { SessionInfo } from '@/types/SessionInfo';
import { doesAuthorExist } from '@/service/pads/AuthorManager';
import { doesGroupExist } from '@/service/pads/GroupManager';

export const findAuthorID = async (groupID:string, sessionCookie: string) => {
  if (!sessionCookie) return undefined;
  /*
   * Sometimes, RFC 6265-compliant web servers may send back a cookie whose
   * value is enclosed in double quotes, such as:
   *
   *   Set-Cookie: sessionCookie="s.37cf5299fbf981e14121fba3a588c02b,
   * s.2b21517bf50729d8130ab85736a11346"; Version=1; Path=/; Domain=localhost; Discard
   *
   * Where the double quotes at the start and the end of the header value are
   * just delimiters. This is perfectly legal: Etherpad parsing logic should
   * cope with that, and remove the quotes early in the request phase.
   *
   * Somehow, this does not happen, and in such cases the actual value that
   * sessionCookie ends up having is:
   *
   *     sessionCookie = '"s.37cf5299fbf981e14121fba3a588c02b,s.2b21517bf50729d8130ab85736a11346"'
   *
   * As quick measure, let's strip the double quotes (when present).
   * Note that here we are being minimal, limiting ourselves to just removing
   * quotes at the start and the end of the string.
   *
   * Fixes #3819.
   * Also, see #3820.
   */
  const sessionIDs = sessionCookie.replace(/^"|"$/g, '').split(',');
  const sessionInfoPromises = sessionIDs.map(async (id) => {
    try {
      return await getSessionInfo(id);
    } catch (err:any) {
      if (err.message === 'sessionID does not exist') {
        console.debug(`SessionManager getAuthorID: no session exists with ID ${id}`);
      } else {
        throw err;
      }
    }
    return undefined;
  });
  const now = Math.floor(Date.now() / 1000);
  const isMatch = (si: {
    groupID: string;
    validUntil: number;
  }|null) => (si != null && si.groupID === groupID && now < si.validUntil);
  const sessionInfo = await firstSatisfies<SessionInfo>(sessionInfoPromises as Promise<SessionInfo>[], isMatch) as SessionInfo;
  if (sessionInfo == null) return undefined;
  return sessionInfo.authorID;
};

/**
 * Checks if a session exists
 * @param {String} sessionID The id of the session
 * @return {Promise<boolean>} Resolves to true if the session exists
 */
export const doesSessionExist = async (sessionID: string): Promise<boolean> => {
  // check if the database entry of this session exists
  const session = await db!.get(`session:${sessionID}`);
  return (session != null);
};


export const createSession = async (groupID: string, authorID: string, validUntil: number) => {
  // check if the group exists
  const groupExists = await doesGroupExist(groupID);
  if (!groupExists) {
    throw new CustomError('groupID does not exist', 'apierror');
  }

  // check if the author exists
  const authorExists = await doesAuthorExist(authorID);
  if (!authorExists) {
    throw new CustomError('authorID does not exist', 'apierror');
  }

  // try to parse validUntil if it's not a number
  if (typeof validUntil !== 'number') {
    validUntil = parseInt(validUntil);
  }

  // check it's a valid number
  if (isNaN(validUntil)) {
    throw new CustomError('validUntil is not a number', 'apierror');
  }

  // ensure this is not a negative number
  if (validUntil < 0) {
    throw new CustomError('validUntil is a negative number', 'apierror');
  }

  // ensure this is not a float value
  if (!isInt(validUntil)) {
    throw new CustomError('validUntil is a float value', 'apierror');
  }

  // check if validUntil is in the future
  if (validUntil < Math.floor(Date.now() / 1000)) {
    throw new CustomError('validUntil is in the past', 'apierror');
  }

  // generate sessionID
  const sessionID = `s.${randomString(16)}`;

  // set the session into the database
  // @ts-ignore
  await db!.set(`session:${sessionID}`, {groupID, authorID, validUntil});

  // Add the session ID to the group2sessions and author2sessions records after creating the session
  // so that the state is consistent.
  await Promise.all([
    // UeberDB's setSub() method atomically reads the record, updates the appropriate (sub)object
    // property, and writes the result.
    // @ts-ignore
    db.setSub(`group2sessions:${groupID}`, ['sessionIDs', sessionID], 1),
    // @ts-ignore
    db.setSub(`author2sessions:${authorID}`, ['sessionIDs', sessionID], 1),
  ]);

  return {sessionID};
};

/**
 * Returns the sessioninfos for a session
 * @param {String} sessionID The id of the session
 * @return {Promise<Object>} the sessioninfos
 */
export const getSessionInfo = async (sessionID:string): Promise<SessionInfo> => {
  // check if the database entry of this session exists
  const session = await db!.get(`session:${sessionID}`);

  if (session == null) {
    // session does not exist
    throw new CustomError('sessionID does not exist', 'apierror');
  }

  // everything is fine, return the sessioninfos
  return session;
};


/**
 * Deletes a session
 * @param {String} sessionID The id of the session
 * @return {Promise<void>} Resolves when the session is deleted
 */
export const deleteSession = async (sessionID:string) => {
  // ensure that the session exists
  const session = await db!.get(`session:${sessionID}`);
  if (session == null) {
    throw new CustomError('sessionID does not exist', 'apierror');
  }

  // everything is fine, use the sessioninfos
  const groupID = session.groupID;
  const authorID = session.authorID;

  await Promise.all([
    // UeberDB's setSub() method atomically reads the record, updates the appropriate (sub)object
    // property, and writes the result. Setting a property to `undefined` deletes that property
    // (JSON.stringify() ignores such properties).
    // @ts-ignore
    db!.setSub(`group2sessions:${groupID}`, ['sessionIDs', sessionID], undefined),
    // @ts-ignore
    db!.setSub(`author2sessions:${authorID}`, ['sessionIDs', sessionID], undefined),
  ]);

  // Delete the session record after updating group2sessions and author2sessions so that the state
  // is consistent.
  await db!.remove(`session:${sessionID}`);
};


export const listSessionsOfGroup = async (groupID: string) => {
  // check that the group exists
  const exists = await doesGroupExist(groupID);
  if (!exists) {
    throw new CustomError('groupID does not exist', 'apierror');
  }

  return await listSessionsWithDBKey(`group2sessions:${groupID}`);
};


// this function is basically the code listSessionsOfAuthor and listSessionsOfGroup has in common
// required to return null rather than an empty object if there are none
/**
 * Returns an array of all sessions of a group
 * @param {String} dbkey The db key to use to get the sessions
 * @return {Promise<*>}
 */
const listSessionsWithDBKey = async (dbkey: string) => {
  // get the group2sessions entry
  const sessionObject = await db!.get(dbkey);
  const sessions = sessionObject ? sessionObject.sessionIDs : null;

  // iterate through the sessions and get the sessioninfos
  for (const sessionID of Object.keys(sessions || {})) {
    try {
      sessions[sessionID] = await getSessionInfo(sessionID);
    } catch (err:any) {
      if (err.name === 'apierror') {
        console.warn(`Found bad session ${sessionID} in ${dbkey}`);
        sessions[sessionID] = null;
      } else {
        throw err;
      }
    }
  }

  return sessions;
};
