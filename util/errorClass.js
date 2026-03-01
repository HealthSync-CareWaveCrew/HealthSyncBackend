// class ErrorClass extends Error {
//     constructor(message, status) {
//         super(message);
//         this.status = status || 500;
//     }
// }

// export default ErrorClass;
class ErrorClass extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;

    // Capture proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ErrorClass;