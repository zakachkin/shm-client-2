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

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const loadReferralCountOnce = async () => {
  if (typeof window.__referralCountValue === 'number') return window.__referralCountValue;
  if (window.__referralCountPromise) return window.__referralCountPromise;

  window.__referralCountPromise = api.get<ReferralResponse>('/user/referrals')
    .then((response) => {
      window.__referralCountValue = toNumber(response.data?.data?.[0]?.total);
      return window.__referralCountValue;
    })
    .catch(() => {
      window.__referralCountValue = 0;
      return 0;
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
