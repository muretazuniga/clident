import { getHandler } from '../server/runtime';
import { createNodeHandler } from '../server/node-handler';
export default createNodeHandler(getHandler);
