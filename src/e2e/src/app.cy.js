describe('CLIDENT - E2E', () => {
  it('debería cargar la aplicación', () => {
    cy.visit('http://localhost:8100');
    cy.get('body').should('be.visible');
  });
});
