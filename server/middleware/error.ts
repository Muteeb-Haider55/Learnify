
import ErrorHandler from "../utils/ErrorHandler";
import express, { Request, Response, NextFunction } from "express";
export const ErrorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error"

  // wrong moongo id
  if(err.name === 'CastError'){
    const message = `Resource not found, Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }
  // Duplicate key error (MongoDB duplicate key code)
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err = new ErrorHandler(message, 400);
  }

  // wrong jwt
    if(err.name === 'JsonWebTokenError'){
    const message = `json web token is invalid, try again`;
    err = new ErrorHandler(message, 400);
  }
  // Expired JWT
    if(err.name === 'TokenExpiredError'){
    const message = `json web token is expired try again`;
    err = new ErrorHandler(message, 400);
  }

  res.status(err.statusCode).json({
    success:false,
    message:err.message
  })

};

