import { LocalProjectRepository } from "@/lib/studio/local-repository";
import type { IProjectRepository } from "@/lib/studio/repository-port";

let instance: IProjectRepository | null = null;

export function getProjectRepository(): IProjectRepository {
  if (!instance) {
    instance = new LocalProjectRepository();
  }
  return instance;
}

export function setProjectRepository(repo: IProjectRepository | null): void {
  instance = repo;
}