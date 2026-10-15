import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { describe, test, expect } from 'vitest';
import { store } from '../store/store';
import Home from '../pages/Home';

const renderHome = () =>
  render(
    <Provider store={store}>
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    </Provider>
  );

describe('Home page', () => {
  test('renders shop by category section', () => {
    renderHome();
    expect(screen.getByText(/Shop by category/i)).toBeInTheDocument();
  });
});
