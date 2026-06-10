export function getAutomationConfig() {
  return {
    deployHook: process.env.ADMIN_VERCEL_DEPLOY_HOOK_URL || '',
  };
}

export async function triggerAdminDeploy() {
  const { deployHook } = getAutomationConfig();
  if (!deployHook) {
    throw new Error('ADMIN_VERCEL_DEPLOY_HOOK_URL no está configurado en Vercel.');
  }

  const response = await fetch(deployHook, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Vercel rechazó el deploy hook: ${response.status}`);
  }
}
