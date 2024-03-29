import { Context, Next } from 'hono';
import { Jwt } from 'hono/utils/jwt';
//
import { User } from '../models';
import { HTTPException } from 'hono/http-exception';

// Protect Route for Authenticated Users
export const protect = async (c: Context, next: Next) => {
    let token;

    if (c.req.header('Authorization') && c.req.header('Authorization')?.startsWith('Bearer')) {
        try {
            token = c.req.header('Authorization')?.replace(/Bearer\s+/i, '');
            if (!token) {
                return c.json({ message: 'Not authorized to access this route' });
            }

            const { id } = await Jwt.verify(token, Bun.env.JWT_SECRET || '');
            const user = await User.findById(id).select('-password');
            c.set('user', user);

            await next();
        } catch (err) {
            throw new HTTPException(401, { message: 'Not authorized to access this route' });
        }
    }

    if (!token) {
        throw new HTTPException(401, { message: 'Not authorized to access this route' });
    }
};

// Check if user is admin
export const isAdmin = async (c: Context, next: Next) => {
    const user = c.get('user');

    if (user && user.isAdmin) {
        await next();
    } else {
        c.status(401);
        throw new HTTPException(401, { message: 'Not authorized as an admin' });
    }
};
