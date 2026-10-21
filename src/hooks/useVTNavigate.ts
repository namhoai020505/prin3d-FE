import { useNavigate } from 'react-router-dom';
import type { NavigateOptions, To } from 'react-router-dom';

/**
 * Drop-in replacement for `useNavigate` that always passes
 * `{ viewTransition: true }` so every programmatic route change
 * triggers the CSS View Transition curtain-wipe animation.
 *
 * Usage:  const navigate = useVTNavigate();
 *         navigate('/create');           // wipe plays automatically
 *         navigate(-1);                  // browser back — wipe plays
 */
export function useVTNavigate() {
  const navigate = useNavigate();

  return (to: To | number, options?: NavigateOptions) => {
    if (typeof to === 'number') {
      navigate(to);
      return;
    }
    navigate(to, { viewTransition: true, ...options });
  };
}
