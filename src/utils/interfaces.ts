export interface PlanData {
  envs: string[];
  folder: string;
  init: boolean;
  modules: string | undefined;
  resources: string | undefined;
}

export interface TfipFlags {
  applyTerraform?: boolean;
  createPR?: boolean;
  directory?: string;
  init?: boolean;
  modules?: string[];
  outputPlan?: boolean;
  resources?: string[];
}
