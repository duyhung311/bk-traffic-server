class BaseError {
  constructor({
    code, message, errors = [], debugError = {},
  }) {
    this.code = code;
    this.message = message;
    this.errors = errors;
    this.debugError = debugError;
  }

  setDebugError(error) {
    this.debugError = error;
    return this;
  }

  addError(domain, reason) {
    this.errors.push({
      ...reason,
      domain,
    });
    return this;
  }

  setMessage(message) {
    this.message = message;
    return this;
  }

  send(res) {
    res.status(200).send(this);
  }
}

module.exports = BaseError;
