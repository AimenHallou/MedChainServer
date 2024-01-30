import { Context } from 'hono';
import { User } from '../models';

/**
 * @api {get} /users Get All Users
 * @apiGroup Users
 * @access Public
 */
export const getUsers = async (c: Context) => {
    const users = await User.find();

    return c.json({ users });
};

/**
 * @api {get} /users/:address Get User By Address
 * @apiGroup Users
 * @access Public
 */
export const getUserByAddress = async (c: Context) => {
    const { address } = c.req.param();

    const user = await User.findOne({ address });

    if (!user) {
        c.status(404);
        throw new Error('User not found');
    }

    return c.json(user);
};

/**
 * @api {post} /users Create User
 * @apiGroup Users
 * @access Public
 */
export const createUser = async (c: Context) => {
    const { address, name, healthcareType, organizationName } = await c.req.json();

    const user = await User.create({
        address,
        name,
        healthcareType,
        organizationName,
    });

    if (!user) {
        c.status(400);
        throw new Error('Invalid user data');
    }

    c.status(201);
    return c.json(user);
};

/**
 * @api {patch} /users/:address Update User
 * @apiGroup Users
 * @access Public
 */
export const updateUserByAddress = async (c: Context) => {
    const { address } = c.req.param();
    const { name, healthcareType, organizationName } = await c.req.json();

    const user = await User.findOne({ address });

    if (!user) {
        c.status(404);
        throw new Error('User not found');
    }

    await user.updateOne({ name, healthcareType, organizationName });

    return c.json({ message: `User with address ${address} successfully updated.` });
};

/**
 * @api {delete} /users/:address Delete User
 * @apiGroup Users
 * @access Public
 */
export const deleteUserByAddress = async (c: Context) => {
    const { address } = c.req.param();

    await User.deleteOne({ address });

    return c.json({ message: `User with address ${address} successfully deleted.` });
};
