/**
 * Scroll state management hook for the effect log.
 *
 * @param {number} totalItems - Total number of items in the list
 * @param {number} visibleItems - Number of visible items in the viewport
 * @returns {{ scrollOffset: number, scrollUp: () => void, scrollDown: () => void, scrollToBottom: () => void }}
 */
export function createScrollState(totalItems, visibleItems) {
  const maxOffset = Math.max(0, totalItems - visibleItems);
  return {
    scrollOffset: maxOffset,
    maxOffset,
  };
}

/**
 * Compute new scroll offset after scrolling up by one page.
 *
 * @param {number} currentOffset
 * @param {number} pageSize
 * @returns {number}
 */
export function scrollUp(currentOffset, pageSize) {
  return Math.max(0, currentOffset - pageSize);
}

/**
 * Compute new scroll offset after scrolling down by one page.
 *
 * @param {number} currentOffset
 * @param {number} pageSize
 * @param {number} maxOffset
 * @returns {number}
 */
export function scrollDown(currentOffset, pageSize, maxOffset) {
  return Math.min(maxOffset, currentOffset + pageSize);
}
