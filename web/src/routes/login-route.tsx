/**
 * Login route component — self-contained auth flow with router navigation.
 * Reads ?redirect= search param to return to the original page after login.
 */
import { useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { LoginPage } from '@/components/login';
import { SnackbarContainer } from '@/components/snackbar/snackbar-container';
import { authLogin, filesGetRoots } from '@/generated/api';
import { setApiToken, clearApiToken } from '@/auth-token';
import { resetSocket } from '@/socket';

export function LoginRoute() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: '/login' });

  const handleLogin = useCallback(async (apiKey: string): Promise<boolean> => {
    try {
      const { data: loginData } = await authLogin({
        body: { apiKey },
        throwOnError: true,
      });
      setApiToken(loginData.accessToken);
      await filesGetRoots({ throwOnError: true });
      resetSocket();
      void navigate({ to: redirect });
      return true;
    } catch {
      clearApiToken();
      return false;
    }
  }, [navigate, redirect]);

  return (
    <>
      <LoginPage onLogin={handleLogin} />
      <SnackbarContainer />
    </>
  );
}
