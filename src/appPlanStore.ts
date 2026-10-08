import { randomUUID } from 'node:crypto';
import type { AppSpecLintResult } from './appSpecLint.js';
import type { AppPlanInput } from './appPlanSchema.js';

const PLAN_TTL_MS = 30 * 60 * 1000;
const MAX_PLANS = 20;

interface StoredPlan {
  spec: AppPlanInput;
  lint: AppSpecLintResult;
  expiresAt: number;
  /** For a replace: the replaced pages' state at lint (pageReplace.replaceFingerprint), checked again at apply. */
  replaceFingerprint?: string;
}

const plans = new Map<string, StoredPlan>();

function prune(now = Date.now()): void {
  for (const [token, plan] of plans) if (plan.expiresAt <= now) plans.delete(token);
  while (plans.size >= MAX_PLANS) plans.delete(plans.keys().next().value!);
}

export function storeAppPlan(spec: AppPlanInput, lint: AppSpecLintResult, replaceFingerprint?: string): {
  plan_token: string;
  expires_in_seconds: number;
} {
  prune();
  const planToken = randomUUID();
  plans.set(planToken, {
    spec: structuredClone(spec),
    lint: structuredClone(lint),
    expiresAt: Date.now() + PLAN_TTL_MS,
    ...(replaceFingerprint ? { replaceFingerprint } : {}),
  });
  return { plan_token: planToken, expires_in_seconds: PLAN_TTL_MS / 1000 };
}

/** A plan without consuming it: apply checks the ids before it spends the one-time token. */
export function peekAppPlan(planToken: string): StoredPlan | undefined {
  prune();
  return plans.get(planToken);
}

/** One-time consume prevents an accidental retry from duplicating already-created objects. */
export function consumeAppPlan(planToken: string): StoredPlan {
  prune();
  const plan = plans.get(planToken);
  if (!plan) throw new Error('Unknown or expired plan_token. Run lint_app_spec again.');
  plans.delete(planToken);
  return plan;
}

export function clearAppPlansForTests(): void {
  plans.clear();
}
