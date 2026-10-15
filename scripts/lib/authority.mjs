// Constitution V1: local workflow permissions are never real-world authorization.
export const AUTHORITY = Object.freeze({ constitution: '1.0', externalActionsEnabled: false, authenticatedApprovalSystem: false, reviewerLabelsAreIdentity: false });
const LOCAL = new Set(['research', 'simulate', 'propose', 'critique', 'revise', 'record-review', 'stop', 'resume', 'export-local']);
export function authorityGate(action) {
  const allowed = LOCAL.has(action);
  return { allowed, authorizesRealWorld: false, risk: allowed ? 'LOCAL_BOUNDED' : 'EXTERNAL_OR_UNKNOWN', reason: allowed ? 'Local workflow only; existing permissions, STOP and evidence gates still apply.' : 'BLOCKED: no authenticated approval system or external execution adapter.' };
}
const ROUTES = Object.freeze({ '/api/start': 'research', '/api/decision': 'propose', '/api/world': 'research', '/api/discover': 'research', '/api/decide': 'record-review', '/api/stop': 'stop', '/api/resume': 'resume', '/api/export': 'export-local' });
export const controlAuthority = pathname => authorityGate(Object.hasOwn(ROUTES, pathname) ? ROUTES[pathname] : null);
