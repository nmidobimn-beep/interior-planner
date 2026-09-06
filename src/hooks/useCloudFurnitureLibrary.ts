import { useCallback, useEffect, useState } from 'react';
import type { CloudFurnitureInput, CloudFurnitureItem } from '../types/cloudFurniture';
import { createCloudFurniture, deleteCloudFurniture, listCloudFurniture, updateCloudFurniture } from '../lib/api/furnitureLibrary';

/**
 * Cloudflare D1 기반 공용 가구 라이브러리. 도면 프로젝트와 완전히 독립적이며(project_id 없음),
 * 모바일에서 실측 등록한 가구가 PC에서도 새로고침하면 바로 보인다(실시간 동기화는 아님).
 */
export function useCloudFurnitureLibrary() {
  const [items, setItems] = useState<CloudFurnitureItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async (query?: string) => {
    setStatus('loading');
    try {
      const list = await listCloudFurniture(query);
      setItems(list);
      setStatus('idle');
      setErrorMessage(null);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : '가구 목록을 불러오지 못했습니다');
    }
  }, []);

  useEffect(() => {
    // 마운트 시 서버(D1)에서 최초 1회 목록을 불러오는 통상적인 데이터 페칭 패턴이다.
    // oxlint-disable-next-line react/set-state-in-effect
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CloudFurnitureInput) => {
      const item = await createCloudFurniture(input);
      await refresh();
      return item;
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<CloudFurnitureInput>) => {
      await updateCloudFurniture(id, patch);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteCloudFurniture(id);
      await refresh();
    },
    [refresh],
  );

  return { items, status, errorMessage, refresh, create, update, remove };
}

export type UseCloudFurnitureLibraryResult = ReturnType<typeof useCloudFurnitureLibrary>;
