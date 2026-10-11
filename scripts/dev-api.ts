import { createServer } from 'node:http';
import { getHandler } from '../server/runtime';
import { createNodeHandler } from '../server/node-handler';
const server = createServer(createNodeHandler(getHandler));
server.listen(3001, '127.0.0.1', () => console.log('API local: http://localhost:3001'));
