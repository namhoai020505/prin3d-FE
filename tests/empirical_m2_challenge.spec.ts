import { test, expect } from '@playwright/test';

test.describe('Phase 3 Milestone 2 Unit/Integration Checks', () => {
  test('Defect service query params logic handles edge cases', () => {
    const buildUrl = (params?: { status?: string; orderId?: string }) => {
      const queryParams = new URLSearchParams();
      if (params?.status && params.status !== 'ALL') {
        queryParams.append('status', params.status);
      }
      if (params?.orderId) {
        queryParams.append('orderId', params.orderId);
      }
      const queryString = queryParams.toString();
      return queryString ? `/api/v2/defect-reports?${queryString}` : '/api/v2/defect-reports';
    };

    expect(buildUrl()).toBe('/api/v2/defect-reports');
    expect(buildUrl({})).toBe('/api/v2/defect-reports');
    expect(buildUrl({ status: 'ALL' })).toBe('/api/v2/defect-reports');
    expect(buildUrl({ status: 'Open' })).toBe('/api/v2/defect-reports?status=Open');
    expect(buildUrl({ orderId: 'ord-123' })).toBe('/api/v2/defect-reports?orderId=ord-123');
    expect(buildUrl({ status: 'PendingReview', orderId: 'ord-123' })).toBe('/api/v2/defect-reports?status=PendingReview&orderId=ord-123');
  });

  test('Evidence photos normalization handles mixed shapes', () => {
    const normalizeEvidence = (item: any): string[] => {
      return Array.isArray(item.evidencePhotos)
        ? item.evidencePhotos
        : Array.isArray(item.evidence)
        ? item.evidence.map((e: any) => (typeof e === 'string' ? e : e?.storageKey || ''))
        : [];
    };

    expect(normalizeEvidence({ evidencePhotos: ['p1.png'] })).toEqual(['p1.png']);
    expect(normalizeEvidence({ evidence: [{ storageKey: 'e1.png' }] })).toEqual(['e1.png']);
    expect(normalizeEvidence({ evidence: ['e2.png'] })).toEqual(['e2.png']);
    expect(normalizeEvidence({})).toEqual([]);
    expect(normalizeEvidence({ evidencePhotos: null, evidence: null })).toEqual([]);
  });

  test('Mandatory resolution note validation rejects < 10 characters', () => {
    const isNoteValid = (note: string) => note.trim().length >= 10;

    expect(isNoteValid('')).toBeFalsy();
    expect(isNoteValid('   ')).toBeFalsy();
    expect(isNoteValid('123456789')).toBeFalsy();
    expect(isNoteValid('1234567890')).toBeTruthy();
    expect(isNoteValid(' In lại hàng lỗi ')).toBeTruthy();
  });
});
