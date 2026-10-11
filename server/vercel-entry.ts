import { getHandler } from './runtime';
import { createNodeHandler } from './node-handler';
export default createNodeHandler(getHandler);
