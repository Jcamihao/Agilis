type AssigneeLabelSource = {
  name: string;
};

export function buildTaskAssigneeLabel(
  assignedToAll: boolean,
  assignees: AssigneeLabelSource[],
): string {
  if (assignedToAll) {
    return 'Todos';
  }

  if (assignees.length === 0) {
    return 'Sem responsaveis';
  }

  return assignees.map((assignee) => assignee.name).join(', ');
}
