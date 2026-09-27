export type JobSourcePermission = {
  display: boolean;
  retention: boolean;
  analysis: boolean;
};

export type JobSourcePermissionDeclaration = Partial<JobSourcePermission>;

export function defineJobSourcePermission(
  declaration: JobSourcePermissionDeclaration,
): JobSourcePermission {
  return {
    display: declaration.display === true,
    retention: declaration.retention === true,
    analysis: declaration.analysis === true,
  };
}
