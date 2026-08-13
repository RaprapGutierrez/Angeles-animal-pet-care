// cypress/e2e/login.cy.js
// MOD-003 Login & Authentication

describe('MOD-003 Login & Authentication', () => {
  beforeEach(() => {
    // Clear any leftover session token before each test so /login always
    // renders the login form instead of redirecting an "already logged in"
    // user straight to /dashboard.
    cy.visit('/login', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TC-LOGIN-01: Empty Field Validation Process
  // ─────────────────────────────────────────────────────────────
  context('TC-LOGIN-01 Empty Field Validation Process', () => {
    // Target Function: handleLogin()
    // Scenario: user submits the login form with both fields empty.
    // The system must block the attempt with a warning modal, and
    // closing the modal must return an unchanged, still-empty form.
    // Steps: visit /login -> click Sign In -> read warning -> close modal -> confirm fields still empty
    it('blocks submission, shows a warning, and returns to an unchanged form after closing it', () => {
      cy.contains('button', 'Sign In').click();
      cy.contains('Missing Fields').should('be.visible');
      cy.contains('Please enter your email address and password.').should('be.visible');
      cy.contains('button', 'OK').click();
      cy.contains('Missing Fields').should('not.exist');
      cy.get('input[type="email"]').should('have.value', '');
      cy.url().should('include', '/login');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TC-LOGIN-02: Invalid Credentials Process
  // ─────────────────────────────────────────────────────────────
  context('TC-LOGIN-02 Invalid Credentials Process', () => {
    // Target Function: handleLogin()
    // Scenario: user submits valid-looking but incorrect credentials.
    // The system must show a loading state while authenticating, then
    // surface a "Login Failed" error without navigating away or clearing the form.
    it('shows a loading state, then a "Login Failed" error for wrong credentials', () => {
      cy.intercept('POST', '**/auth/v1/token*', {
        statusCode: 400,
        delay: 500,
        body: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
      }).as('loginAttempt');

      cy.get('input[type="email"]').type('wrong.user@example.com');
      cy.get('input[type="password"]').type('WrongPassword123');
      cy.contains('button', 'Sign In').click();
      cy.contains('button', 'Signing in...').should('exist');
      cy.wait('@loginAttempt');
      cy.contains('Login Failed').should('be.visible');
      cy.get('input[type="email"]').should('have.value', 'wrong.user@example.com');
      cy.url().should('include', '/login');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TC-LOGIN-03: Successful Login Process
  // ─────────────────────────────────────────────────────────────
  context('TC-LOGIN-03 Successful Login Process', () => {
    // Target Function: handleLogin() -> completeLogin() -> resolveRedirect()
    // Scenario: user submits correct credentials. The system must
    // authenticate, fetch the user's profile, show a personalized
    // "Welcome back" popup, then automatically redirect based on role.
    it('logs the user in, shows a welcome popup, and redirects to the dashboard', () => {
      cy.intercept('POST', '**/auth/v1/token*', {
        statusCode: 200,
        body: {
          access_token: 'fake-access-token',
          refresh_token: 'fake-refresh-token',
          user: { id: 'user-123', email: 'jane.doe@example.com', user_metadata: {} },
        },
      }).as('authRequest');

      cy.intercept('GET', '**/rest/v1/profiles*', {
        statusCode: 200,
        body: {
          first_name: 'Rafael',
          last_name: 'Gutierrez',
          role: 'super_admin',
          branch_id: null,
          status: 'active',
          phone: null,
        },
      }).as('getProfile');

      cy.intercept('PATCH', '**/rest/v1/profiles*', {
        statusCode: 204,
        body: '',
      }).as('updateProfile');

      cy.get('input[type="email"]').type('rafaelanunciacion502@gmail.com');
      cy.get('input[type="password"]').type('Raf_895623');
      cy.contains('button', 'Sign In').click();

      cy.wait('@authRequest');
      cy.wait('@getProfile');
      cy.wait('@updateProfile');

      cy.contains('Welcome back').should('be.visible');
      cy.contains('Rafael Gutierrez').should('be.visible');
      cy.contains('Super Admin').should('be.visible');

      cy.url({ timeout: 3000 }).should('include', '/dashboard');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TC-LOGIN-04: Password Visibility Toggle Process
  // ─────────────────────────────────────────────────────────────
  context('TC-LOGIN-04 Password Visibility Toggle Process', () => {
    // Target Function: setShowPassword()
    // Scenario: user types a password, then uses the eye icon to reveal
    // and re-hide it, confirming the input's type actually switches.
    it('toggles the password field between masked and visible text', () => {
      cy.get('input[type="password"]').type('MySecret123');
      cy.get('input[type="password"]').should('have.value', 'MySecret123');
      cy.get('button[aria-label="Show password"]').click();
      cy.get('input[type="text"]').should('have.value', 'MySecret123');
      cy.get('button[aria-label="Hide password"]').click();
      cy.get('input[type="password"]').should('have.value', 'MySecret123');
    });
  });
});