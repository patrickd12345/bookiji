import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import AuthEntry from '@/components/AuthEntry';
import ChooseRolePage from '@/app/choose-role/page';
import MainNavigation from '@/components/MainNavigation';

vi.mock('@/lib/supabaseClient', () => {
  const profile: any = { roles: ['customer', 'vendor'], beta_status: null };
  return {
    supabase: {
      auth: {
        signUp: vi.fn(() => Promise.resolve({ error: null })),
        getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user1' } } })),
        getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: 'user1' } } } })),
      },
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({})) })),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: profile })) })) }))
      }))
    }
  };
});

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }), usePathname: () => '' }));

describe('role flow', () => {
  it('signs up, chooses roles, and switches dashboards', async () => {
    process.env.NEXT_PUBLIC_ENABLE_NAV = 'true';
    const { getByLabelText, getByText } = render(<AuthEntry mode="signup" />);
    fireEvent.change(getByLabelText('Email address'), { target: { value: 'a@test.com' } });
    fireEvent.change(getByLabelText('Password'), { target: { value: 'pass' } });
    fireEvent.change(getByLabelText('Confirm Password'), { target: { value: 'pass' } });
    fireEvent.click(getByText('Create Account'));
    await waitFor(() => expect(pushMock).toHaveBeenNthCalledWith(1, '/choose-role'));

    const { getByLabelText: getCRLabel, getByText: getCRText } = render(<ChooseRolePage />);
    fireEvent.click(getCRLabel('Customer'));
    fireEvent.click(getCRLabel('Provider'));
    fireEvent.click(getCRText('Continue'));
    await waitFor(() => expect(pushMock).toHaveBeenNthCalledWith(2, '/customer/dashboard'));

    const { findByTestId } = render(<MainNavigation />);
    const switcher = await findByTestId('role-switcher');
    fireEvent.change(switcher, { target: { value: 'vendor' } });
    await waitFor(() => expect(pushMock).toHaveBeenNthCalledWith(3, '/vendor/dashboard'));
  });
});
