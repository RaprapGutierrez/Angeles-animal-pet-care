// cypress/e2e/login.cy.js
// MOD-003 Login & Authentication

describe('MOD-003 Login & Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  context('TC-LOGIN-01 handleLogin()', () => {
    it('shows a "Missing Fields" warning when email and password are empty', () => {
      cy.contains('button', 'Sign In').click();
      cy.contains('Missing Fields').should('be.visible');
      cy.contains('Please enter your email address and password.').should('be.visible');
    });
  });
});