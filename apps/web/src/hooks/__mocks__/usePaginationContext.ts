export const usePaginationContext = () => ({
  currentPage: 1,
  setCurrentPage: jest.fn(),
  itemsPerPage: 6,
  totalPages: 5,
});
