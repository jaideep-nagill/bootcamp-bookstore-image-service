import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import cors from 'cors';
import { GetObjectCommand, PutObjectCommand, S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();

dotenv.config( { path: './config.env' } );

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ADMIN_ACCESS_KEY;
const secretAccessKey = process.env.AWS_ADMIN_SECRET_ACCESS_KEY;


const s3Client = new S3Client( {
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
} );

const storage = multer.memoryStorage();
const upload = multer( { storage: storage } );

app.use( cors() );
app.use( express.json() );

app.post( '/', upload.single( 'image' ), async ( req, res ) => {
  const file = req.file;
  const imageName = req.body.imageName;
  const user_role = req.body.user_role;
  if ( !( user_role === 'admin' || user_role === 'seller' ) )
    res.status( 401 ).send( "you are not authorized to access this resource." );
  const fileBuffer = await sharp( file.buffer )
    .resize( { height: 462, width: 300, fit: "contain" } )
    .toBuffer();

  // Configure the upload details to send to S3
  const uploadParams = {
    Bucket: bucketName,
    Body: fileBuffer,
    Key: imageName,
    ContentType: file.mimetype
  };

  // Send the upload to S3
  await s3Client.send( new PutObjectCommand( uploadParams ) );

  res.status( 200 ).send();
} );


app.get( "/:imageName", async ( req, res ) => {
  const { imageName } = req.params;
  const imageUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand( {
      Bucket: bucketName,
      Key: imageName
    } )
  );

  res.status( 200 ).json( {
    "payload": {
      "imageName": imageName,
      "url": imageUrl
    }
  } );
} );

app.delete( "/api/posts/:imageName", async ( req, res ) => {


  const deleteParams = {
    Bucket: bucketName,
    Key: imageName,
  };

  await s3Client.send( new DeleteObjectCommand( deleteParams ) );


  res.status( 204 ).send();
} );

app.listen( process.env.PORT, () => {
  console.log( "App running" );
} );
