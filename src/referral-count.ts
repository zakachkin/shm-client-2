import { api } from './api/client';

type ReferralResponse = {
  data?: Array<{
    total?: number | string;
  }>;
};

let cachedReferralCount: number | null = null;
let loadingPromise: Promise<number> | null = null;
let observer: MutationObserver | null = null;

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const loadReferralCount = async () => {
  if (cachedReferralCount !== null) return cachedReferralCount;
  if (loadingPromise) return loadingPromise;

  loadingPromise = api.get<ReferralResponse>('/user/referrals')
    .then((response) => {
      cachedReferralCount = toNumber(response.data?.data?.[0]?.total);
      return cachedReferralCount;
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
    referralElement.style.fontWeight = '400';
    referralElement.style.color = 'var(--mantine-color-dimmed)';
    bonusContainer.appendChild(referralElement);
  }

  referralElement.textContent = `Приведено друзей: ${count}`;
};

const renderReferralCount = async () => {
  const bonusContainer = findBonusContainer();
  if (!bonusContainer) return false;

  const count = await loadReferralCount();

  if (!document.body.contains(bonusContainer)) return false;
  upsertReferralCount(bonusContainer, count);
  return true;
};

export const initReferralCount = () => {
  if (typeof window === 'undefined') return;

  void renderReferralCount().then((rendered) => {
    if (rendered) return;

    observer = new MutationObserver(() => {
      void renderReferralCount().then((isRendered) => {
        if (isRendered) {
          observer?.disconnect();
          observer = null;
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
};
