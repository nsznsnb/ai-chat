import '@testing-library/jest-dom'

// Mock react-markdown to avoid ESM issues
jest.mock('react-markdown', () => {
  return {
    __esModule: true,
    default: ({ children }) => {
      return children;
    },
  };
});

jest.mock('remark-gfm', () => {
  return {
    __esModule: true,
    default: () => {},
  };
});

// Mock scrollIntoView for ChatContainer tests
Element.prototype.scrollIntoView = jest.fn();
