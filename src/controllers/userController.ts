import { Context } from 'hono';
import { User } from '../models';
import { genToken } from '../utils';
import { Document } from 'mongoose';
import { IUserDoc } from '../models/User';
import { HTTPException } from 'hono/http-exception';

/**
 * @api {post} /users Create User
 * @apiGroup Users
 * @access Public
 */
export const register = async (c: Context) => {
    const { username, password } = await c.req.json();

    if (!username || !password) {
        c.status(400);
        throw new Error('Please provide a username and password');
    }

    // Check for existing user
    const userExists = await User.findOne({ username });
    if (userExists) {
        c.status(400);
        throw new Error('Username has been taken');
    }

    const user = await User.create({
        username,
        password,
    });

    if (!user) {
        c.status(400);
        throw new Error('Invalid user data');
    }

    c.status(201);

    const token = await genToken(user._id.toString());

    return c.json({
        success: true,
        user: user,
        token,
        message: 'User created successfully',
    });
};

/**
 * @api {post} /users/login Login User
 * @apiGroup Users
 * @access Public
 */
export const login = async (c: Context) => {
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
            user: user,
            token,
            message: 'User logged in successfully',
        });
    }
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
 * @api {post} /users/updateDetails Update Details
 * @apiGroup Users
 * @access Private
 */
export const updateDetails = async (c: Context) => {
    const { name, healthcareType, organizationName } = await c.req.json();

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    const updated = await User.findByIdAndUpdate(user._id, { name, healthcareType, organizationName }, { new: true });

    return c.json({ user: updated, message: 'Details updated successfully' });
};

/**
 * @api {post} /users/linkAddress Link Address
 * @apiGroup Users
 * @access Private
 */
export const linkAddress = async (c: Context) => {
    const { address } = await c.req.json();

    if (!address) {
        throw new HTTPException(400, { message: 'Please provide an address' });
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    if (user.address) {
        throw new HTTPException(400, { message: 'Address already linked' });
    }

    const addressTaken = await User.findOne({ address });

    if (addressTaken) {
        throw new HTTPException(400, { message: 'Address already linked to another user' });
    }

    const updated = await User.findByIdAndUpdate(user._id, { address }, { new: true });

    return c.json({ user: updated, message: 'Address linked successfully' });
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

    return c.json({ user: updated, message: 'Address unlinked successfully' });
};
