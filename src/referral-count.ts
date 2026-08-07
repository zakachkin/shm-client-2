import { userApi } from './api/client';

type UserProfileResponse = {
  data?: Record<string, unknown> | Record<string, unknown>[];
};

let loadingPromise: Promise<number> | null = null;

const normalizeReferrals = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (Array.isArray(value)) return value.length;
  return 0;
};

const getProfileFromResponse = (payload: UserProfileResponse) => {
  return Array.isArray(payload.data) ? payload.data[0] : payload.data;
};

const loadReferralCount = async () => {
  if (loadingPromise) return loadingPromise;

  loadingPromise = userApi.getProfile()
    .then((response) => {
      const profile = getProfileFromResponse(response.data as UserProfileResponse);
      return profile ? normalizeReferrals(profile.referrals) : 0;
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
