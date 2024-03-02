'use strict';

type ChatObject = {
  authorId: string;
  userId?: string;
  userName?: string;
  displayName?: string;
};

/**
 * Represents a chat message stored in the database and transmitted among users. Plugins can extend
 * the object with additional properties.
 *
 * Supports serialization to JSON.
 */
class ChatMessage {
  private text: string | null;
  authorId: string | null;
  time: number | null;
  displayName: string | null;
  static fromObject(obj: ChatObject): ChatMessage {
    // The userId property was renamed to authorId, and userName was renamed to displayName. Accept
    // the old names in case the db record was written by an older version of Etherpad.
    obj = { ...obj } as ChatObject; // Don't mutate the caller's object.
    if ('userId' in obj && !('authorId' in obj)) {
      // @ts-ignore
      obj.authorId = obj.userId;
    }
    delete obj.userId;
    if ('userName' in obj && !('displayName' in obj))
      obj.displayName = obj.userName;
    delete obj.userName;
    return Object.assign(new ChatMessage(), obj);
  }

  /**
   * @param {?string} [text] - Initial value of the `text` property.
   * @param {?string} [authorId] - Initial value of the `authorId` property.
   * @param {?number} [time] - Initial value of the `time` property.
   */
  constructor(
    text: string | null = null,
    authorId: string | null = null,
    time: number | null = null
  ) {
    /**
     * The raw text of the user's chat message (before any rendering or processing).
     *
     * @type {?string}
     */
    this.text = text;

    /**
     * The user's author ID.
     *
     * @type {?string}
     */
    this.authorId = authorId;

    /**
     * The message's timestamp, as milliseconds since epoch.
     *
     * @type {?number}
     */
    this.time = time;

    /**
     * The user's display name.
     *
     * @type {?string}
     */
    this.displayName = null;
  }
}

export default ChatMessage;
