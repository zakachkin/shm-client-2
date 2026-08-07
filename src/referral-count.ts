type UserProfileResponse = {
  data?: Record<string, unknown> | Record<string, unknown>[];
};

let cachedReferralCount: number | null = null;
let loadingPromise: Promise<number> | null = null;

const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop()?.split(';').shift() || '' : '';
};

const normalizeReferrals = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (Array.isArray(value)) return value.length;
  return 0;
};

const loadReferralCount = async () => {
  if (cachedReferralCount !== null) return cachedReferralCount;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch('/shm/v1/user', {
    credentials: 'include',
    headers: {
      ...(getCookie('session_id') ? { session_id: getCookie('session_id') } : {}),
    },
  })
    .then(async (response) => {
      if (!response.ok) return 0;
      const payload = (await response.json()) as UserProfileResponse;
      const profile = Array.isArray(payload.data) ? payload.data[0] : payload.data;
      cachedReferralCount = profile ? normalizeReferrals(profile.referrals) : 0;
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

const renderReferralCount = async () => {
  if (!window.location.pathname.includes('/profile')) return;

  const bonusContainer = findBonusContainer();
  if (!bonusContainer || bonusContainer.querySelector('[data-referral-count]')) return;

  const count = await loadReferralCount();

  if (!document.body.contains(bonusContainer) || bonusContainer.querySelector('[data-referral-count]')) return;

  const referralElement = document.createElement('div');
  referralElement.dataset.referralCount = 'true';
  referralElement.textContent = `Приведено друзей: ${count}`;
  referralElement.style.marginTop = '14px';
  referralElement.style.fontSize = '14px';
  referralElement.style.fontWeight = '500';
  referralElement.style.color = 'var(--mantine-color-red-6)';

  bonusContainer.appendChild(referralElement);
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
