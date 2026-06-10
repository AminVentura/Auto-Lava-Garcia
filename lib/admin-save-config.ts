type EnvMap = Record<string, string | undefined>;

const tokenLikeEnvName = /^(ghp|github_pat)_[A-Za-z0-9_]+$/;

export type AdminSaveConfigStatus = {
  ok: boolean;
  missing: string[];
  warning: string | null;
};

export function getAdminSaveConfigStatus(env: EnvMap = process.env): AdminSaveConfigStatus {
  const missing = ['ADMIN_GITHUB_TOKEN'].filter((key) => !env[key]);
  const tokenWasUsedAsName = Object.keys(env).some((key) => tokenLikeEnvName.test(key));

  return {
    ok: missing.length === 0,
    missing,
    warning: tokenWasUsedAsName
      ? 'Parece que un token fue guardado como nombre de variable. Debe rotarse y guardarse con el nombre ADMIN_GITHUB_TOKEN.'
      : null,
  };
}
