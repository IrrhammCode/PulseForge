"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreateProjectInput, StudioProject } from "@/types/studio";
import {
  createProject,
  deleteProject,
  listProjects,
} from "@/lib/studio/storage";

export function useStudioProjects() {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setProjects(listProjects());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    (input: CreateProjectInput) => {
      const project = createProject(input);
      refresh();
      return project;
    },
    [refresh]
  );

  const remove = useCallback(
    (id: string) => {
      const ok = deleteProject(id);
      if (ok) refresh();
      return ok;
    },
    [refresh]
  );

  return { projects, ready, refresh, create, remove };
}