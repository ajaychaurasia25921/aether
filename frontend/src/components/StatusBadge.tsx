export function StatusBadge({ status }: Readonly<{ status: string }>) {
  const normalized = status.toUpperCase();
  const tone = normalized.includes('FAIL')
    ? 'danger'
    : normalized.includes('PENDING') || normalized.includes('PACKAGING') || normalized.includes('DRAFT')
      ? 'warn'
      : normalized.includes('NEVER')
        ? ''
        : 'ok';

  return <span className={`badge ${tone}`}>{status}</span>;
}
