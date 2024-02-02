import { Hono } from 'hono';
import { user } from '../controllers';
import { protect } from '../middlewares';

const users = new Hono();

users.post('/register', (c) => user.register(c));

users.post('/login', (c) => user.login(c));

users.get('/me', protect, (c) => user.getMe(c));

users.patch('/updateDetails', protect, (c) => user.updateDetails(c));

users.post('/linkAddress', protect, (c) => user.linkAddress(c));

users.post('/unlinkAddress', protect, (c) => user.unlinkAddress(c));

export default users;
