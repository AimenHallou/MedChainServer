import { Document, Schema, model } from 'mongoose';

export interface IUser {
    username: string;
    password: string;
    address: string;
    name: string;
    healthcareType: string;
    organizationName: string;
}

export interface IUserDoc extends IUser, Document {
    mathPassword: (pass: string) => Promise<boolean>;
}

const userSchema = new Schema<IUserDoc>(
    {
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        address: { type: String },
        name: { type: String },
        healthcareType: { type: String },
        organizationName: { type: String },
    },
    {
        timestamps: true,
    }
);

// Match user entered password to hashed password in database
userSchema.methods.mathPassword = async function (enteredPassword: string) {
    return Bun.password.verifySync(enteredPassword, this.password);
};

// Hash password with Bun
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    // use bcrypt
    this.password = await Bun.password.hash(this.password, {
        algorithm: 'bcrypt',
        cost: 4, // number between 4-31
    });
});

const User = model('User', userSchema);
export default User;
