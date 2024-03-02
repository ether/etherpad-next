const base64url = /^(?=(?:.{4})*$)[A-Za-z0-9_-]*(?:[AQgw]==|[AEIMQUYcgkosw048]=)?$/;


export const isValidAuthorToken= (t: string|object) => {
  if (typeof t !== 'string' || !t.startsWith('t.')) return false;
  const v = t.slice(2);
  return v.length > 0 && base64url.test(v);
};
