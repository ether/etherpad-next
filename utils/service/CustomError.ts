class CustomError extends Error {
  /**
   * Creates an instance of CustomError.
   * @param {string} message
   * @param {string} [name='Error'] a custom name for the error object
   * @memberof CustomError
   */
  constructor(message:string, name: string = 'Error') {
    super(message);
    this.name = name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default CustomError;