import { Hono } from 'hono';
import { user } from '../controllers';
import { protect } from '../middlewares';

const users = new Hono();

// Create User
users.post('/register', (c) => user.createUser(c));

// Login User
users.post('/login', (c) => user.loginUser(c));

users.get('/me', protect, (c) => user.getMe(c));

users.post('/linkAddress', protect, (c) => user.linkAddress(c));

users.post('/unlinkAddress', protect, (c) => user.unlinkAddress(c));

export default users;
