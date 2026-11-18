export type AllowancePlan = {
  /** People with no allowance yet: they always get the new value. */
  unset: number;
  /** People with a different allowance: changed only when `overwrite` is on. */
  custom: number;
  /** People who would actually change. */
  changing: number;
};

/** What setting one allowance for everyone would do, from each person's current allowance. */
export function planAllowance(current: readonly number[], allowance: number, overwrite: boolean): AllowancePlan {
  const unset = current.filter((c) => c === 0 && allowance !== 0).length;
  const custom = current.filter((c) => c !== 0 && c !== allowance).length;
  return { unset, custom, changing: unset + (overwrite ? custom : 0) };
}

/** Whether one person's allowance changes under the same rule. */
export function allowanceChanges(current: number, allowance: number, overwrite: boolean) {
  if (current === allowance) return false;
  return current === 0 || overwrite;
}
