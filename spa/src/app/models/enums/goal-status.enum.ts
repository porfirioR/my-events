export enum GoalStatus {
  Active = 1,
  Completed = 2,
  Paused = 3,
  Cancelled = 4,
  Withdrawn = 5
}

export const GoalStatusLabels: Record<GoalStatus, string> = {
  [GoalStatus.Active]: 'Active',
  [GoalStatus.Completed]: 'Completed',
  [GoalStatus.Paused]: 'Paused',
  [GoalStatus.Cancelled]: 'Cancelled',
  [GoalStatus.Withdrawn]: 'Withdrawn'
};

export const GoalStatusIcons: Record<GoalStatus, string> = {
  [GoalStatus.Active]: 'fa-clock-rotate-left',
  [GoalStatus.Completed]: 'fa-circle-check',
  [GoalStatus.Paused]: 'fa-circle-pause',
  [GoalStatus.Cancelled]: 'fa-circle-xmark',
  [GoalStatus.Withdrawn]: 'fa-hand-holding-dollar'
};

export const GoalStatusColors: Record<GoalStatus, string> = {
  [GoalStatus.Active]: 'text-success',
  [GoalStatus.Completed]: 'text-info',
  [GoalStatus.Paused]: 'text-warning',
  [GoalStatus.Cancelled]: 'text-error',
  [GoalStatus.Withdrawn]: 'text-primary'
};