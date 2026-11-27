import type { Cookie } from '@playwright/test';
import type { User } from '#src/api/models/user.ts';
import type { TestUser } from '#src/fixtures/test-user.ts';

export type Session = { token: string; userId: User['id']; userLabel: string; loginTime: string };

export function toSession(user: TestUser): Session {
  // The login page labels the user with displayedName || email.
  return {
    token: user.token,
    userId: user.id,
    userLabel: user.input.displayedName,
    loginTime: user.loginTime,
  };
}

// The five cookies the login page and backend set; the frontend reads them to restore the session.
export function sessionCookies(session: Session, baseURL: string): Cookie[] {
  const { hostname, protocol } = new URL(baseURL);
  const cookie = (name: string, value: string): Cookie => ({
    name,
    value,
    domain: hostname,
    path: '/',
    expires: -1,
    httpOnly: false,
    // Follows the address: the local app is plain http, another environment may be https.
    secure: protocol === 'https:',
    sameSite: 'Lax',
  });
  return [
    cookie('rolnopolToken', encodeURIComponent(session.token)),
    cookie('rolnopolIsLogged', 'true'),
    cookie('rolnopolUserId', String(session.userId)),
    cookie('rolnopolUserLabel', session.userLabel),
    cookie('rolnopolLoginTime', encodeURIComponent(session.loginTime)),
  ];
}
