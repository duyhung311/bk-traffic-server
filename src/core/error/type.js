module.exports = {
  badRequest: {
    code: 400,
    message: 'Bad input parameter',
  },
  unauthorized: {
    code: 401,
    message: 'Unauthorized. Token error',
  },
  forbidden: {
    code: 403,
    message: 'Forbidden',
  },
  notFound: {
    code: 404,
    message: 'Not found',
  },
  conflict: {
    code: 409,
    message: 'Resource exists',
  },
  internalServerError: {
    code: 500,
    message: 'Internal server error',
  },
  serviceError: {
    code: 503,
    message: '3rd service error',
  },
};
