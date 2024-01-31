import { Context } from 'hono';
import { User } from '../models';
import { genToken } from '../utils';
import { Document } from 'mongoose';
import { IUserDoc } from '../models/User';

/**
 * @api {post} /users Create User
 * @apiGroup Users
 * @access Public
 */
export const createUser = async (c: Context) => {
    const { username, password, name, healthcareType, organizationName } = await c.req.json();

    console.log(username);
    // Check for existing user
    const userExists = await User.findOne({ username });
    if (userExists) {
        c.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        username,
        password,
        name,
        healthcareType,
        organizationName,
    });

    if (!user) {
        c.status(400);
        throw new Error('Invalid user data');
    }

    c.status(201);

    const token = await genToken(user._id.toString());

    return c.json({
        success: true,
        data: user,
        token,
        message: 'User created successfully',
    });
};

/**
 * @api {post} /users/login Login User
 * @apiGroup Users
 * @access Public
 */
export const loginUser = async (c: Context) => {
    const { username, password } = await c.req.json();

    // Check for existing user
    if (!username || !password) {
        c.status(400);
        throw new Error('Please provide a username and password');
    }

    const user = await User.findOne({ username });
    if (!user) {
        c.status(401);
        throw new Error('No user found with this username');
    }

    if (!(await user.mathPassword(password))) {
        c.status(401);
        throw new Error('Invalid credentials');
    } else {
        const token = await genToken(user._id.toString());

        return c.json({
            success: true,
            data: user,
            token,
            message: 'User logged in successfully',
        });
    }
};

export const updateAddress = async (c: Context) => {
    const { address } = await c.req.json();
    const user: typeof User = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    await user.updateOne({ address });

    return c.json({ message: 'Address updated successfully' });
};

/**
 * @api {get} /users/me Get Me
 * @apiGroup Users
 * @access Private
 */
export const getMe = async (c: Context) => {
    const user = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    return c.json({ user });
};

/**
 * @api {post} /users/linkAddress Link Address
 * @apiGroup Users
 * @access Private
 */
export const linkAddress = async (c: Context) => {
    const { address } = await c.req.json();

    if (!address) {
        c.status(400);
        throw new Error('Address is required');
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (user.address) {
        c.status(400);
        throw new Error('Address already linked');
    }

    const addressTaken = await User.findOne({ address });

    if (addressTaken) {
        c.status(400);
        throw new Error('Address already linked to another user');
    }

    const updated = await User.findByIdAndUpdate(user._id, { address }, { new: true });

    return c.json({ data: updated, message: 'Address linked successfully' });
};

/**
 * @api {post} /users/unlinkAddress Unlink Address
 * @apiGroup Users
 * @access Private
 */
export const unlinkAddress = async (c: Context) => {
    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address linked');
    }

    const updated = await User.findByIdAndUpdate(user._id, { address: '' }, { new: true });

    console.log(updated);

    return c.json({ data: updated, message: 'Address unlinked successfully' });
};
