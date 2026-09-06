import { useCallback, useEffect, useState } from 'react';
import type { ProjectSummary } from '../types/project';
import type { FloorPlanDocument } from '../core/serialization';
import type { UseFloorPlanResult } from './useFloorPlan';
import { createProject, deleteProject, getProject, listProjects, renameProject, saveProjectPlan } from '../lib/api/projects';
import { listProjectObjects, replaceProjectObjects } from '../lib/api/projectObjects';

const FALLBACK_LAYER = { id: 'layer-default', name: '레이어 1', visible: true };

/**
 * 도면 프로젝트(Cloudflare D1) 관리 — 가구 라이브러리와 완전히 독립된 저장소다.
 * 프로젝트를 불러오면 현재 도면(floorPlan)을 통째로 교체하고, 저장하면 가구는
 * project_objects로, 나머지(벽/문/치수선 등)는 projects.plan_data로 나눠 저장한다.
 * 로컬 자동 저장(localStorage)은 이 훅과 무관하게 항상 그대로 동작한다.
 */
export function useProjects(floorPlan: UseFloorPlanResult) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    try {
      setProjects(await listProjects());
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '프로젝트 목록을 불러오지 못했습니다');
    }
  }, []);

  useEffect(() => {
    // 마운트 시 서버(D1)에서 최초 1회 프로젝트 목록을 불러오는 통상적인 데이터 페칭 패턴이다.
    // oxlint-disable-next-line react/set-state-in-effect
    refreshProjects();
  }, [refreshProjects]);

  const selectProject = useCallback(
    async (id: string) => {
      setStatus('loading');
      try {
        const [project, objects] = await Promise.all([getProject(id), listProjectObjects(id)]);
        const rest = (project.plan_data ? JSON.parse(project.plan_data) : {}) as Partial<FloorPlanDocument>;
        const furniture = objects.map((row) => JSON.parse(row.object_data));
        const doc: FloorPlanDocument = {
          version: rest.version ?? 1,
          savedAt: rest.savedAt ?? new Date().toISOString(),
          walls: rest.walls ?? [],
          furniture,
          doors: rest.doors ?? [],
          windows: rest.windows ?? [],
          outlets: rest.outlets ?? [],
          paths: rest.paths ?? [],
          labels: rest.labels ?? [],
          polygons: rest.polygons ?? [],
          dimensions: rest.dimensions ?? [],
          layers: rest.layers && rest.layers.length > 0 ? rest.layers : [FALLBACK_LAYER],
          activeLayerId: rest.activeLayerId ?? FALLBACK_LAYER.id,
        };
        if (!floorPlan.loadDocument(doc)) throw new Error('도면 데이터 형식이 올바르지 않습니다');
        setActiveProjectId(id);
        setStatus('idle');
        setErrorMessage(null);
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : '프로젝트를 불러오지 못했습니다');
      }
    },
    [floorPlan],
  );

  /** 현재 도면을 지정한 project_id에 저장(plan_data + project_objects). */
  const saveToProject = useCallback(
    async (projectId: string) => {
      const doc = floorPlan.exportDocument();
      const { furniture, ...rest } = doc;
      await saveProjectPlan(projectId, rest);
      await replaceProjectObjects(
        projectId,
        furniture.map((f) => ({
          id: f.id,
          furniture_id: f.libraryId ?? null,
          x: f.x,
          y: f.y,
          rotation: f.rotationDeg,
          layer_id: f.layerId,
          object_data: f,
        })),
      );
    },
    [floorPlan],
  );

  const saveActiveProject = useCallback(async () => {
    if (!activeProjectId) return;
    setStatus('saving');
    try {
      await saveToProject(activeProjectId);
      floorPlan.markSaved();
      await refreshProjects();
      setStatus('idle');
      setErrorMessage(null);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : '저장하지 못했습니다');
    }
  }, [activeProjectId, saveToProject, floorPlan, refreshProjects]);

  /** 현재 도면을 "다른 이름"의 새 프로젝트로 저장한다(미저장 변경 보호에서 사용) —
   * 활성 프로젝트는 바꾸지 않는다(바로 이어서 다른 프로젝트를 불러오는 흐름이라 의미 없음). */
  const saveAsNewProject = useCallback(
    async (name: string) => {
      setStatus('saving');
      try {
        const project = await createProject(name);
        await saveToProject(project.id);
        floorPlan.markSaved();
        await refreshProjects();
        setStatus('idle');
        setErrorMessage(null);
        return project;
      } catch (err) {
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : '다른 이름으로 저장하지 못했습니다');
        throw err;
      }
    },
    [saveToProject, floorPlan, refreshProjects],
  );

  const createAndSelect = useCallback(
    async (name: string) => {
      const project = await createProject(name);
      floorPlan.newDocument();
      await refreshProjects();
      setActiveProjectId(project.id);
    },
    [floorPlan, refreshProjects],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      await renameProject(id, name);
      await refreshProjects();
    },
    [refreshProjects],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteProject(id);
      if (activeProjectId === id) setActiveProjectId(null);
      await refreshProjects();
    },
    [activeProjectId, refreshProjects],
  );

  return {
    projects,
    activeProjectId,
    status,
    errorMessage,
    refreshProjects,
    selectProject,
    saveActiveProject,
    saveAsNewProject,
    createAndSelect,
    rename,
    remove,
  };
}

export type UseProjectsResult = ReturnType<typeof useProjects>;
