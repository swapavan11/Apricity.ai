import mongoose from 'mongoose';

export async function connectMongo() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Apricityassign';
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });
}


