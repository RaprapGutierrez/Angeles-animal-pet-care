// cypress/e2e/register.cy.js
// MOD-004 Registration

describe('MOD-004 Registration', () => {
  beforeEach(() => {
    // Stub the branch dropdown's data source so step 2 always shows the
    // same, predictable list regardless of what's really in the database.
    cy.intercept('GET', '**/rest/v1/branches*', {
      statusCode: 200,
      body: [
        { id: 1, name: 'Angeles Main' },
        { id: 2, name: 'Tarlac Branch' },
      ],
    }).as('getBranches');

    cy.visit('/register', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TC-REG-01: Step 1 — Personal Info Validation Process
  // ─────────────────────────────────────────────────────────────
  context('TC-REG-01 Step 1 Personal Info Validation Process', () => {
    // Target Function: handleNextStep() [step 1]
    // Scenario: user tries to advance with missing fields, then with an
    // invalid contact number, then succeeds with valid data.
    it('blocks empty fields and invalid phone numbers, then advances with valid data', () => {
      cy.contains('button', 'Next').click();
      cy.contains('Missing Fields').should('be.visible');
      cy.contains('Please fill in your first name, last name, and contact number.').should('be.visible');
      cy.contains('button', 'OK').click();

      cy.get('.float-group input[type="text"]').eq(0).type('Jane');
      cy.get('.float-group input[type="text"]').eq(1).type('Doe');
      cy.get('input[type="tel"]').type('123');
      cy.contains('button', 'Next').click();
      cy.contains('Invalid Contact Number').should('be.visible');
      cy.contains('button', 'OK').click();

      cy.get('input[type="tel"]').clear().type('09171234567');
      cy.contains('button', 'Next').click();

      cy.contains('Select sex').should('be.visible');
      cy.contains('Select branch').should('be.visible');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TC-REG-02: Step 2 — Branch Selection Process
  // ─────────────────────────────────────────────────────────────
  context('TC-REG-02 Step 2 Branch Selection Process', () => {
    // Target Function: handleNextStep() [step 2]
    // Scenario: user tries to advance without picking a branch, then
    // selects a sex and branch from the custom dropdowns and advances.
    it('blocks advancing without a branch, then advances once one is selected', () => {
      cy.get('.float-group input[type="text"]').eq(0).type('Jane');
      cy.get('.float-group input[type="text"]').eq(1).type('Doe');
      cy.get('input[type="tel"]').type('09171234567');
      cy.contains('button', 'Next').click();

      cy.contains('button', 'Next').click();
      cy.contains('Missing Branch').should('be.visible');
      cy.contains('Please select your preferred branch.').should('be.visible');
      cy.contains('button', 'OK').click();

      cy.contains('Select sex').click();
      cy.contains('Male').click();

      cy.wait('@getBranches');
      cy.contains('Select branch').click();
      cy.contains('Angeles Main').click();

      cy.contains('button', 'Next').click();
      cy.contains('label', 'Email address').should('be.visible');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TC-REG-03: Step 3 — Email Validation Process
  // ─────────────────────────────────────────────────────────────
  context('TC-REG-03 Step 3 Email Validation Process', () => {
    // Target Function: handleNextStep() [step 3]
    // Scenario: user tries to advance with no email, then a malformed
    // email, then succeeds with a valid one.
    it('blocks missing/invalid email formats, then advances with a valid email', () => {
      cy.get('.float-group input[type="text"]').eq(0).type('Jane');
      cy.get('.float-group input[type="text"]').eq(1).type('Doe');
      cy.get('input[type="tel"]').type('09171234567');
      cy.contains('button', 'Next').click();
      cy.contains('Select sex').click();
      cy.contains('Male').click();
      cy.wait('@getBranches');
      cy.contains('Select branch').click();
      cy.contains('Angeles Main').click();
      cy.contains('button', 'Next').click();

      cy.contains('button', 'Next').click();
      cy.contains('Missing Email').should('be.visible');
      cy.contains('button', 'OK').click();

      cy.get('input[type="text"]').type('not-an-email');
      cy.contains('button', 'Next').click();
      cy.contains('Invalid Email').should('be.visible');
      cy.contains('button', 'OK').click();

      cy.get('input[type="text"]').clear().type('jane.doe@example.com');
      cy.contains('button', 'Next').click();

      cy.contains('label', 'Password').should('be.visible');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TC-REG-04: Step 4 — Password Validation Process
  // ─────────────────────────────────────────────────────────────
  context('TC-REG-04 Step 4 Password Validation Process', () => {
    // Target Function: handleRegister() [pre-submit validation]
    // Scenario: user tries to submit a password that's too short, then
    // a mismatched confirm-password, and the system blocks both.
    it('blocks a weak password and a mismatched confirmation', () => {
      cy.get('.float-group input[type="text"]').eq(0).type('Jane');
      cy.get('.float-group input[type="text"]').eq(1).type('Doe');
      cy.get('input[type="tel"]').type('09171234567');
      cy.contains('button', 'Next').click();
      cy.contains('Select sex').click();
      cy.contains('Male').click();
      cy.wait('@getBranches');
      cy.contains('Select branch').click();
      cy.contains('Angeles Main').click();
      cy.contains('button', 'Next').click();
      cy.get('input[type="text"]').type('jane.doe@example.com');
      cy.contains('button', 'Next').click();

      cy.get('input[type="password"]').eq(0).type('abc');
      cy.get('input[type="password"]').eq(1).type('abc');
      cy.contains('button', 'Create Account').click();
      cy.contains('Weak Password').should('be.visible');
      cy.contains('button', 'OK').click();

      cy.get('input[type="password"]').eq(0).clear().type('StrongPass1!');
      cy.get('input[type="password"]').eq(1).clear().type('DifferentPass1!');
      cy.contains('button', 'Create Account').click();
      cy.contains('Password Mismatch').should('be.visible');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // TC-REG-05: Successful Registration Process
  // ─────────────────────────────────────────────────────────────
  context('TC-REG-05 Successful Registration Process', () => {
    // Target Function: handleRegister() [full submission]
    // Scenario: user completes all 4 steps with valid data. The system
    // must create the account, show a success popup, then redirect.
    it('completes registration, shows a success popup, and redirects', () => {
      cy.intercept('POST', '**/auth/v1/signup*', {
        statusCode: 200,
        body: {
          user: { id: 'user-456', email: 'jane.doe@example.com' },
          session: { access_token: 'fake-access-token', refresh_token: 'fake-refresh-token' },
        },
      }).as('signUpRequest');

      cy.intercept('POST', '**/rest/v1/profiles*', {
        statusCode: 201,
        body: {},
      }).as('insertProfile');

      cy.get('.float-group input[type="text"]').eq(0).type('Jane');
      cy.get('.float-group input[type="text"]').eq(1).type('Doe');
      cy.get('input[type="tel"]').type('09171234567');
      cy.contains('button', 'Next').click();

      cy.contains('Select sex').click();
      cy.contains('Male').click();
      cy.wait('@getBranches');
      cy.contains('Select branch').click();
      cy.contains('Angeles Main').click();
      cy.contains('button', 'Next').click();

      cy.get('input[type="text"]').type('jane.doe@example.com');
      cy.contains('button', 'Next').click();

      cy.get('input[type="password"]').eq(0).type('StrongPass1!');
      cy.get('input[type="password"]').eq(1).type('StrongPass1!');
      cy.contains('button', 'Create Account').click();

      cy.wait('@signUpRequest');
      cy.wait('@insertProfile');

      cy.contains('Welcome!').should('be.visible');
      cy.contains("Your account has been created and you're now signed in.").should('be.visible');
      cy.url({ timeout: 3000 }).should('include', '/dashboard');
    });
  });
});