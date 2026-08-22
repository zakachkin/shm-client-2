import { api } from './api/client';

type ReferralResponse = {
  data?: Array<{
    total?: number | string;
  }>;
};

declare global {
  interface Window {
    __referralCountPromise?: Promise<number>;
    __referralCountValue?: number;
    __referralCountInitialized?: boolean;
  }
}

const CACHE_KEY = 'shm_referral_count_value';
const LOCK_KEY = 'shm_referral_count_loading';
const LOCK_TTL_MS = 10000;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getStoredCount = () => {
  try {
    const value = window.localStorage.getItem(CACHE_KEY);
    return value === null ? null : toNumber(value);
  } catch {
    return null;
  }
};

const setStoredCount = (count: number) => {
  try {
    window.localStorage.setItem(CACHE_KEY, String(count));
  } catch {
  }
};

const isLocked = () => {
  try {
    const lockedAt = Number(window.localStorage.getItem(LOCK_KEY) || 0);
    return lockedAt > 0 && Date.now() - lockedAt < LOCK_TTL_MS;
  } catch {
    return false;
  }
};

const setLock = () => {
  try {
    window.localStorage.setItem(LOCK_KEY, String(Date.now()));
  } catch {
  }
};

const clearLock = () => {
  try {
    window.localStorage.removeItem(LOCK_KEY);
  } catch {
  }
};

const waitForStoredCount = () => new Promise<number>((resolve) => {
  let attempts = 0;
  const maxAttempts = 20;

  const check = () => {
    const stored = getStoredCount();
    if (stored !== null) {
      resolve(stored);
      return;
    }

    attempts += 1;
    if (attempts >= maxAttempts) {
      resolve(0);
      return;
    }

    window.setTimeout(check, 250);
  };

  check();
});

const loadReferralCountOnce = async () => {
  if (typeof window.__referralCountValue === 'number') return window.__referralCountValue;
  if (window.__referralCountPromise) return window.__referralCountPromise;

  const stored = getStoredCount();
  if (stored !== null) {
    window.__referralCountValue = stored;
    return stored;
  }

  if (isLocked()) {
    window.__referralCountPromise = waitForStoredCount().then((count) => {
      window.__referralCountValue = count;
      return count;
    });
    return window.__referralCountPromise;
  }

  setLock();

  window.__referralCountPromise = api.get<ReferralResponse>('/user/referrals')
    .then((response) => {
      window.__referralCountValue = toNumber(response.data?.data?.[0]?.total);
      setStoredCount(window.__referralCountValue);
      return window.__referralCountValue;
    })
    .catch(() => {
      window.__referralCountValue = 0;
      return 0;
    })
    .finally(() => {
      clearLock();
    });

  return window.__referralCountPromise;
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
    referralElement.style.fontWeight = '400';
    referralElement.style.color = 'var(--mantine-color-dimmed)';
    bonusContainer.appendChild(referralElement);
  }

  referralElement.textContent = `Приведено друзей: ${count}`;
};

const renderWhenReady = (count: number) => {
  let attempts = 0;
  const maxAttempts = 20;

  const tryRender = () => {
    const bonusContainer = findBonusContainer();

    if (bonusContainer) {
      upsertReferralCount(bonusContainer, count);
      return;
    }

    attempts += 1;
    if (attempts < maxAttempts) {
      window.setTimeout(tryRender, 250);
    }
  };

  tryRender();
};

export const initReferralCount = () => {
  if (typeof window === 'undefined') return;
  if (window.__referralCountInitialized) return;

  window.__referralCountInitialized = true;

  void loadReferralCountOnce().then((count) => {
    renderWhenReady(count);
  });
};
