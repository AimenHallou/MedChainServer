import { Hono } from 'hono';
import { user } from '../controllers';

const users = new Hono();

// Get All Users
users.get('/', (c) => user.getUsers(c));

// Get User By Address
users.get('/:address', (c) => user.getUserByAddress(c));

// Create User
users.post('/', (c) => user.createUser(c));

// Update User By Address
users.patch('/:address', (c) => user.updateUserByAddress(c));

// Delete User By Address
users.delete('/:address', (c) => user.deleteUserByAddress(c));

export default users;
