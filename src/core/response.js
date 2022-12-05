class BaseResponse {
  constructor({
    code, message, data, debugError,
  }) {
    this.code = code;
    this.message = message;
    this.data = data;
    this.debugError = debugError;
  }

  send(res) {
    res.send(this);
    return this;
  }

  setField(field, data) {
    this[field] = data;
    return this;
  }
}

const ResponseFactory = {
  success: (data) => new BaseResponse({ code: 200, message: 'success', data }),
  error: (code, message, error, debugError) => new BaseResponse({
    code, message, errors: error, debugError,
  }),
};

module.exports = {
  ResponseFactory,
  BaseResponse,
};
