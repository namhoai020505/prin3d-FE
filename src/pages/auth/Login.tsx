import { Navigate } from 'react-router-dom';

/**
 * Legacy `/login` route adapter:
 * Automatically redirects user to home `/` and triggers the V2 unified `LoginModal`
 * with OTP verification and modern auth state machine.
 */
export default function Login() {
  return <Navigate to="/" replace state={{ openLoginModal: true }} />;
}
