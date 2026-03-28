// import ErrorClass from "./errorClass.js";

// export const asyncHandler = (fn) => {
//   return (req, res, next) => {
//     return fn(req, res, next).catch((error) => {
//       return next(new ErrorClass(error.message, error.status));
//     });
//   };
// };

// export const globalErrorHandling = (error, req, res, next) => {
//   if (error) {
//     if (process.env.MOOD == "DEV") {
//       return res.status(error.status || 400).json({
//         msgError: error.message,
//         error,
//         stack: error.stack,
//       });
//     } else {
//       return res.status(error.status || 400).json({ message: error.message });
//     }
//   }
// };

import ErrorClass from "./errorClass.js";

/**
 * Wrap async controllers to avoid try/catch everywhere
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      next(
        error instanceof ErrorClass
          ? error
          : new ErrorClass(error.message, error.statusCode),
      );
    });
  };
};

/**
 * Global Error Handling Middleware
 */
export const globalErrorHandling = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV === "development") {
    return res.status(statusCode).json({
      success: false,
      data: null,
      message: error.message,
      stack: error.stack,
      error,
    });
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    message: error.message || "Internal Server Error",
  });
};
