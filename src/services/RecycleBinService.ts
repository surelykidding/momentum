import { Chain, DeletedChain } from '../types';
import { storage } from '../utils/storage';

export class RecycleBinService {
  /**
   * 获取所有已删除的链条
   */
  static async getDeletedChains(): Promise<DeletedChain[]> {
    try {
      const deletedChains = storage.getDeletedChains();
      console.log(`[RecycleBin] 获取到 ${deletedChains.length} 条已删除的链条`);
      return deletedChains;
    } catch (error) {
      console.error('[RecycleBin] 获取已删除链条失败:', error);
      throw new Error('获取已删除链条失败');
    }
  }

  /**
   * 将链条移动到回收箱（软删除）
   */
  static async moveToRecycleBin(chainId: string): Promise<void> {
    try {
      console.log(`[RecycleBin] 将链条 ${chainId} 移动到回收箱`);
      storage.softDeleteChain(chainId);
      console.log(`[RecycleBin] 链条 ${chainId} 已成功移动到回收箱`);
    } catch (error) {
      console.error(`[RecycleBin] 移动链条 ${chainId} 到回收箱失败:`, error);
      throw new Error(`移动链条到回收箱失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 从回收箱恢复链条
   */
  static async restoreChain(chainId: string): Promise<void> {
    try {
      console.log(`[RecycleBin] 恢复链条 ${chainId}`);
      storage.restoreChain(chainId);
      console.log(`[RecycleBin] 链条 ${chainId} 已成功恢复`);
    } catch (error) {
      console.error(`[RecycleBin] 恢复链条 ${chainId} 失败:`, error);
      throw new Error(`恢复链条失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 永久删除链条
   */
  static async permanentlyDelete(chainId: string): Promise<void> {
    try {
      console.log(`[RecycleBin] 永久删除链条 ${chainId}`);
      storage.permanentlyDeleteChain(chainId);
      console.log(`[RecycleBin] 链条 ${chainId} 已永久删除`);
    } catch (error) {
      console.error(`[RecycleBin] 永久删除链条 ${chainId} 失败:`, error);
      throw new Error(`永久删除链条失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量恢复链条
   */
  static async bulkRestore(chainIds: string[]): Promise<void> {
    try {
      console.log(`[RecycleBin] 批量恢复 ${chainIds.length} 条链条:`, chainIds);
      
      for (const chainId of chainIds) {
        storage.restoreChain(chainId);
      }
      
      console.log(`[RecycleBin] 成功批量恢复 ${chainIds.length} 条链条`);
    } catch (error) {
      console.error('[RecycleBin] 批量恢复链条失败:', error);
      throw new Error(`批量恢复链条失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量永久删除链条
   */
  static async bulkPermanentDelete(chainIds: string[]): Promise<void> {
    try {
      console.log(`[RecycleBin] 批量永久删除 ${chainIds.length} 条链条:`, chainIds);
      
      for (const chainId of chainIds) {
        storage.permanentlyDeleteChain(chainId);
      }
      
      console.log(`[RecycleBin] 成功批量永久删除 ${chainIds.length} 条链条`);
    } catch (error) {
      console.error('[RecycleBin] 批量永久删除链条失败:', error);
      throw new Error(`批量永久删除链条失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 清理过期的已删除链条
   */
  static async cleanupExpiredChains(olderThanDays: number = 30): Promise<number> {
    try {
      console.log(`[RecycleBin] 开始清理超过 ${olderThanDays} 天的已删除链条`);
      
      const deletedCount = storage.cleanupExpiredDeletedChains(olderThanDays);
      
      console.log(`[RecycleBin] 清理完成，共删除 ${deletedCount} 条过期链条`);
      return deletedCount;
    } catch (error) {
      console.error('[RecycleBin] 清理过期链条失败:', error);
      throw new Error(`清理过期链条失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取回收箱统计信息
   */
  static async getRecycleBinStats(): Promise<{
    totalDeleted: number;
    expiringSoon: number; // 7天内将被自动删除的数量
  }> {
    try {
      const deletedChains = await this.getDeletedChains();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const expiringSoon = deletedChains.filter(chain => 
        chain.deletedAt < sevenDaysFromNow && chain.deletedAt > thirtyDaysAgo
      ).length;

      return {
        totalDeleted: deletedChains.length,
        expiringSoon
      };
    } catch (error) {
      console.error('[RecycleBin] 获取回收箱统计信息失败:', error);
      return { totalDeleted: 0, expiringSoon: 0 };
    }
  }
}