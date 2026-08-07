import { userApi } from './api/client';

type AnyRecord = Record<string, unknown>;

type UserProfileResponse = {
  data?: AnyRecord | AnyRecord[];
};

let loadingPromise: Promise<number> | null = null;

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeReferrals = (value: unknown): number | null => {
  const directNumber = toNumber(value);
  if (directNumber !== null) return directNumber;

  if (Array.isArray(value)) return value.length;

  if (value && typeof value === 'object') {
    const record = value as AnyRecord;

    for (const key of ['count', 'total', 'qnt', 'quantity', 'length']) {
      const nestedNumber = toNumber(record[key]);
      if (nestedNumber !== null) return nestedNumber;
    }

    for (const key of ['data', 'items', 'list', 'rows']) {
      if (Array.isArray(record[key])) return record[key].length;
    }
  }

  return null;
};

const findReferralsValue = (source: unknown, seen = new Set<unknown>()): unknown => {
  if (!source || typeof source !== 'object' || seen.has(source)) return undefined;
  seen.add(source);

  if (Array.isArray(source)) {
    for (const item of source) {
      const nested = findReferralsValue(item, seen);
      if (nested !== undefined) return nested;
    }
    return undefined;
  }

  const record = source as AnyRecord;

  if (Object.prototype.hasOwnProperty.call(record, 'referrals')) {
    return record.referrals;
  }

  for (const value of Object.values(record)) {
    const nested = findReferralsValue(value, seen);
    if (nested !== undefined) return nested;
  }

  return undefined;
};

const getProfileFromResponse = (payload: UserProfileResponse) => {
  return Array.isArray(payload.data) ? payload.data[0] : payload.data;
};

const loadReferralCount = async () => {
  if (loadingPromise) return loadingPromise;

  loadingPromise = userApi.getProfile()
    .then((response) => {
      const payload = response.data as UserProfileResponse;
      const profile = getProfileFromResponse(payload);
      const referralsValue = findReferralsValue(profile || payload);
      return normalizeReferrals(referralsValue) ?? 0;
    })
    .catch(() => 0)
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
};

const findBonusContainer = () => {
  const textElements = Array.from(document.querySelectorAll<HTMLElement>('.mantine-Text-root'));

  return textElements
    .find((element) => element.textContent?.trim().startsWith('Бонусы:'))
    ?.parentElement || null;
};

const upsertReferralCount = (bonusContainer: HTMLElement, count: number) => {
  let referralElement = bonusContainer.querySelector<HTMLElement>('[data-referral-count]');

  if (!referralElement) {
    referralElement = document.createElement('div');
    referralElement.dataset.referralCount = 'true';
    referralElement.style.marginTop = '14px';
    referralElement.style.fontSize = '14px';
    referralElement.style.fontWeight = '500';
    referralElement.style.color = 'var(--mantine-color-red-6)';
    bonusContainer.appendChild(referralElement);
  }

  referralElement.textContent = `Приведено друзей: ${count}`;
};

const renderReferralCount = async () => {
  const bonusContainer = findBonusContainer();
  if (!bonusContainer) return;

  const count = await loadReferralCount();

  if (!document.body.contains(bonusContainer)) return;
  upsertReferralCount(bonusContainer, count);
};

export const initReferralCount = () => {
  if (typeof window === 'undefined') return;

  const observer = new MutationObserver(() => {
    void renderReferralCount();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  setInterval(() => {
    void renderReferralCount();
  }, 1000);

  void renderReferralCount();
};
