// Deployment template, NOT part of the static release. Mount as /api/account/* only after backend acceptance.
import { createAccountHandler } from './handler.mjs';
export default createAccountHandler();
