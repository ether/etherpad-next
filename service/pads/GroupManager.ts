import { db } from '@/backend/DB';
import CustomError from '@/utils/service/CustomError';
import { padManagerInstance } from '@/service/pads/PadManager';
import { randomString } from '@/utils/service/utilFuncs';
import { deleteSession } from '@/service/pads/SessionManager';

/**
 * Lists all groups
 * @return {Promise<{groupIDs: string[]}>} The ids of all groups
 */
export const listAllGroups = async () => {
  let groups = await db!.get('groups');
  groups = groups || {};

  const groupIDs = Object.keys(groups);
  return {groupIDs};
};

/**
 * Deletes a group and all associated pads
 * @param {String} groupID The id of the group
 * @return {Promise<void>} Resolves when the group is deleted
 */
export const deleteGroup = async (groupID: string): Promise<void> => {
  const group = await db!.get(`group:${groupID}`);

  // ensure group exists
  if (group == null) {
    // group does not exist
    throw new CustomError('groupID does not exist', 'apierror');
  }

  // iterate through all pads of this group and delete them (in parallel)
  await Promise.all(Object.keys(group.pads).map(async (padId) => {
    const pad = await padManagerInstance.getPad(padId);
    await pad!.remove();
  }));

  // Delete associated sessions in parallel. This should be done before deleting the group2sessions
  // record because deleting a session updates the group2sessions record.
  const {sessionIDs = {}} = await db!.get(`group2sessions:${groupID}`) || {};
  await Promise.all(Object.keys(sessionIDs).map(async (sessionId) => {
    await deleteSession(sessionId);
  }));

  await Promise.all([
    db!.remove(`group2sessions:${groupID}`),
    // UeberDB's setSub() method atomically reads the record, updates the appropriate property, and
    // writes the result. Setting a property to `undefined` deletes that property (JSON.stringify()
    // ignores such properties).
    // @ts-ignore
    db!.setSub('groups', [groupID], undefined),
    ...Object.keys(group.mappings || {}).map(async (m) => await db!.remove(`mapper2group:${m}`)),
  ]);

  // Remove the group record after updating the `groups` record so that the state is consistent.
  await db!.remove(`group:${groupID}`);
};

/**
 * Checks if a group exists
 * @param {String} groupID the id of the group to delete
 * @return {Promise<boolean>} Resolves to true if the group exists
 */
export const doesGroupExist = async (groupID: string) => {
  // try to get the group entry
  const group = await db!.get(`group:${groupID}`);

  return (group != null);
};

/**
 * Creates a new group
 * @return {Promise<{groupID: string}>} the id of the new group
 */
export const createGroup = async () => {
  const groupID = `g.${randomString(16)}`;
  // @ts-ignore
  await db!.set(`group:${groupID}`, {pads: {}, mappings: {}});
  // Add the group to the `groups` record after the group's individual record is created so that
  // the state is consistent. Note: UeberDB's setSub() method atomically reads the record, updates
  // the appropriate property, and writes the result.
  // @ts-ignore
  await db!.setSub('groups', [groupID], 1);
  return {groupID};
};

/**
 * Creates a new group if it does not exist already and returns the group ID
 * @param groupMapper the mapper of the group
 * @return {Promise<{groupID: string}|{groupID: *}>} a promise that resolves to the group ID
 */
export const createGroupIfNotExistsFor = async (groupMapper: string|object) => {
  if (typeof groupMapper !== 'string') {
    throw new CustomError('groupMapper is not a string', 'apierror');
  }
  const groupID = await db!.get(`mapper2group:${groupMapper}`);
  if (groupID && await doesGroupExist(groupID)) return {groupID};
  const result = await createGroup();
  await Promise.all([
    db!.set(`mapper2group:${groupMapper}`, result.groupID),
    // Remember the mapping in the group record so that it can be cleaned up when the group is
    // deleted. Although the core Etherpad API does not support multiple mappings for the same
    // group, the database record does support multiple mappings in case a plugin decides to extend
    // the core Etherpad functionality. (It's also easy to implement it this way.)
    // @ts-ignore
    db!.setSub(`group:${result.groupID}`, ['mappings', groupMapper], 1),
  ]);
  return result;
};

/**
 * Creates a group pad
 * @param {String} groupID The id of the group
 * @param {String} padName The name of the pad
 * @param {String} text The text of the pad
 * @param {String} authorId The id of the author
 * @return {Promise<{padID: string}>} a promise that resolves to the id of the new pad
 */
export const createGroupPad = async (groupID: string, padName: string, text: string, authorId: string = ''): Promise<{ padID: string; }> => {
  // create the padID
  const padID = `${groupID}$${padName}`;

  // ensure group exists
  const groupExists = await doesGroupExist(groupID);

  if (!groupExists) {
    throw new CustomError('groupID does not exist', 'apierror');
  }

  // ensure pad doesn't exist already
  const padExists = await padManagerInstance.doesPadExist(padID);

  if (padExists) {
    // pad exists already
    throw new CustomError('padName does already exist', 'apierror');
  }

  // create the pad
  await padManagerInstance.getPad(padID, text, authorId);

  // create an entry in the group for this pad
  // @ts-ignore
  await db!.setSub(`group:${groupID}`, ['pads', padID], 1);

  return {padID};
};

/**
 * Lists all pads of a group
 * @param {String} groupID The id of the group
 * @return {Promise<{padIDs: string[]}>} a promise that resolves to the ids of all pads of the group
 */
export const listPads = async (groupID: string): Promise<{ padIDs: string[]; }> => {
  const exists = await doesGroupExist(groupID);

  // ensure the group exists
  if (!exists) {
    throw new CustomError('groupID does not exist', 'apierror');
  }

  // group exists, let's get the pads
  // @ts-ignore
  const result = await db!.getSub(`group:${groupID}`, ['pads']);
  const padIDs = Object.keys(result);

  return {padIDs};
};
