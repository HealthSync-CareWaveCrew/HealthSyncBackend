const AWS = require("aws-sdk");
require("dotenv").config();
const dotenv = require("dotenv");
dotenv.config();

// Configure the AWS SDK
const connectS3 = async () => {
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log(`s3 Connected ....`);
    return s3Client;
  } catch (err) {
    console.log(`Fail to s3 ...${err}`);
    throw err; // You may want to handle this error further up the call stack
  }
};

module.exports = connectS3;
