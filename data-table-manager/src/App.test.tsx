import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Data Table Manager title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Data Table Manager/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders system status panel', () => {
  render(<App />);
  const statusElement = screen.getByText(/System Status/i);
  expect(statusElement).toBeInTheDocument();
});

test('renders authentication status', () => {
  render(<App />);
  const authElement = screen.getByText(/Authentication:/i);
  expect(authElement).toBeInTheDocument();
});
