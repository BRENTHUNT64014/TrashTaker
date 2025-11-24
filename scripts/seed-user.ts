import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { UserRole } from '../src/types/enums';

// Load environment variables
dotenv.config({ path: '.env.local' });

// User schema inline to avoid import issues
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), required: true },
  phone: String,
  territory: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function seedUser() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'bhunt@greenwaywaste.com' });
    
    if (existingUser) {
      console.log('User already exists. Updating password...');
      const hashedPassword = await bcrypt.hash('Temp1234', 10);
      existingUser.password = hashedPassword;
      existingUser.updatedAt = new Date();
      await existingUser.save();
      console.log('Password updated successfully!');
    } else {
      console.log('Creating new user...');
      const hashedPassword = await bcrypt.hash('Temp1234', 10);
      
      const user = new User({
        email: 'bhunt@greenwaywaste.com',
        password: hashedPassword,
        name: 'Brandon Hunt',
        role: UserRole.ADMIN,
        phone: '+18164764790',
        isActive: true,
      });

      await user.save();
      console.log('User created successfully!');
    }

    console.log('\nLogin credentials:');
    console.log('Email: bhunt@greenwaywaste.com');
    console.log('Password: Temp1234');
    console.log('Role: Admin');

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding user:', error);
    process.exit(1);
  }
}

seedUser();
