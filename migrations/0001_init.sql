-- 도면 프로젝트(가구 목록과 완전히 독립적으로 저장됨)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- 가구를 제외한 나머지 도면 데이터(JSON): walls/doors/windows/outlets/paths/labels/polygons/dimensions/layers/activeLayerId
  plan_data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 공용 가구 라이브러리 — 어떤 도면에도 종속되지 않는 실제 보유 가구 원본
CREATE TABLE IF NOT EXISTS furniture_library (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  width REAL NOT NULL,
  height REAL NOT NULL,
  shape_type TEXT NOT NULL DEFAULT 'rectangle',
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 특정 도면에 실제 배치된 가구 객체(원본은 furniture_library, 배치 상태는 여기)
CREATE TABLE IF NOT EXISTS project_objects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  furniture_id TEXT,
  x REAL NOT NULL DEFAULT 0,
  y REAL NOT NULL DEFAULT 0,
  rotation REAL NOT NULL DEFAULT 0,
  layer_id TEXT,
  -- 배치된 가구 객체 전체(JSON, desktop Furniture 타입 그대로: width/height/color/shape/name/memo 등)
  object_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (furniture_id) REFERENCES furniture_library(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_project_objects_project ON project_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_project_objects_furniture ON project_objects(furniture_id);
