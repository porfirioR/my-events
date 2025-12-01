export enum InstallmentStatus {
  Pending = 1,
  Paid = 2,
  Skipped = 3
}

export const InstallmentStatusLabels: Record<InstallmentStatus, string> = {
  [InstallmentStatus.Pending]: 'Pending',
  [InstallmentStatus.Paid]: 'Paid',
  [InstallmentStatus.Skipped]: 'Skipped'
};

export const InstallmentStatusIcons: Record<InstallmentStatus, string> = {
  [InstallmentStatus.Pending]: 'fa-clock',
  [InstallmentStatus.Paid]: 'fa-check-circle',
  [InstallmentStatus.Skipped]: 'fa-forward'
};

export const InstallmentStatusColors: Record<InstallmentStatus, string> = {
  [InstallmentStatus.Pending]: 'text-warning',
  [InstallmentStatus.Paid]: 'text-success',
  [InstallmentStatus.Skipped]: 'text-base-content/50'
};