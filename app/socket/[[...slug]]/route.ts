const GET = () =>
  Response.json(
    { message: 'this feature is not implemented yet' },
    { status: 501 }
  );

export {
  GET,
  // will be removed in the future
  GET as POST,
  GET as PUT,
  GET as DELETE,
  GET as PATCH,
};
