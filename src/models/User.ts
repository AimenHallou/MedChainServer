import { Document, Schema, model } from 'mongoose';

interface IUser {
    address: string;
    name: string;
    healthcareType: string;
    organizationName: string;
}

interface IUserDoc extends IUser, Document {}

const userSchema = new Schema<IUserDoc>(
    {
        address: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        healthcareType: { type: String, required: true },
        organizationName: { type: String, required: true },
    },
    {
        timestamps: true,
    }
);

const User = model('User', userSchema);
export default User;
