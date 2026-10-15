describe('Bookstore User Journey', () => {
  it('loads the home page', () => {
    cy.visit('/');
    cy.contains('Shop by category').should('be.visible');
  });

  it('allows a user to browse books from a category', () => {
    cy.visit('/');
    cy.contains('Shop by category').should('be.visible');
    cy.contains('Programming').click();
    cy.url().should('include', '/books');
  });

  it('redirects a guest away from the admin area', () => {
    cy.visit('/admin');
    cy.url().should('not.include', '/admin/dashboard');
  });
});