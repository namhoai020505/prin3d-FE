import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Legacy `/login` route adapter:
 * Automatically redirects user to home `/` and triggers the V2 unified `LoginModal`
 * with OTP verification and modern auth state machine.
 */
export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/', { replace: true });
    window.dispatchEvent(
      new CustomEvent('idea2model:open-login-modal', { detail: { mode: 'login' } }),
    );
  }, [navigate]);

  return null;
}
