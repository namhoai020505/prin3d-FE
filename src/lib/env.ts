/**
 * Cấu hình biến môi trường chuẩn hóa của ứng dụng Frontend.
 * Đảm bảo không hardcode URL hay magic strings theo kỹ năng hardcode_eliminator.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5133';

export const PAYOS_RETURN_URL: string =
  (import.meta.env.VITE_PAYOS_RETURN_URL as string) ||
  'http://localhost:5173/orders/:id/checkout-return';

export const PAYOS_CANCEL_URL: string =
  (import.meta.env.VITE_PAYOS_CANCEL_URL as string) ||
  'http://localhost:5173/orders/:id/checkout-cancel';

export const AI_CONSENT_POLICY_VERSION: string =
  (import.meta.env.VITE_AI_CONSENT_POLICY_VERSION as string) || 'v1.0';

export const AI_CONSENT_PURPOSE: string =
  (import.meta.env.VITE_AI_CONSENT_PURPOSE as string) || 'AiModelProcessing';

export const GOOGLE_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
  '928800899912-81ire3k9j09sibcegq1hriqgg231ahqr.apps.googleusercontent.com';


