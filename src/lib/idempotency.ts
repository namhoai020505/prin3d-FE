import { v4 as uuidv4 } from 'uuid';

/**
 * IdempotencyManager - Quản lý Idempotency-Key (UUID v4) trong suốt vòng đời thao tác.
 * Chống bấm đúp / chống replay trùng lặp khi mạng chập chờn.
 */
export class IdempotencyManager {
  private static currentKeys = new Map<string, string>();

  /**
   * Lấy key hiện tại hoặc sinh UUID v4 mới nếu chưa có trong scope.
   */
  public static getOrCreateKey(actionScope: string): string {
    const existingKey = this.currentKeys.get(actionScope);
    if (existingKey) {
      return existingKey;
    }
    const newKey = uuidv4();
    this.currentKeys.set(actionScope, newKey);
    return newKey;
  }

  /**
   * Sinh key UUID v4 mới khi người dùng bắt đầu thao tác hoàn toàn mới.
   */
  public static refreshKey(actionScope: string): string {
    const newKey = uuidv4();
    this.currentKeys.set(actionScope, newKey);
    return newKey;
  }

  /**
   * Xóa key sau khi thao tác hoàn tất thành công.
   */
  public static clearKey(actionScope: string): void {
    this.currentKeys.delete(actionScope);
  }
}

