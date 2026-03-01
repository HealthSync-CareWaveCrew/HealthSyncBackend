import mongoose from "mongoose";
// require("dotenv").config();
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
  try {
    const uri =  process.env.MONGODB_URI;

    const res = await mongoose.connect(uri);
    console.log(`DB Connected ....`);
    return res;
  } catch (err) {
    console.log(`Fail to connectDB ...${err}`);
    throw err; // You may want to handle this error further up the call stack
  }
};

export default connectDB;
