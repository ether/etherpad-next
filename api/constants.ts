const BASE_PATH = "/api/v1";
export const BASE_PATH_AUTHORS = `${BASE_PATH}/authors`;
export const BASE_PATH_GROUPS = `${BASE_PATH}/groups`;
export const BASE_PATH_PADS = `${BASE_PATH}/pads`;
export const BASE_PATH_SESSIONS = `${BASE_PATH}/sessions`;


// Special paths for authors

export const BASE_PATH_AUTHOR_PAD = `${BASE_PATH_AUTHORS}/:authorID/pads`;
export const BASE_PATH_AUTHOR_GET = `${BASE_PATH_AUTHORS}/:authorID`;
