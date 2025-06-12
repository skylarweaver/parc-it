import { OfficeRequest } from '../types/models';

/**
 * Filters requests by date range.
 * @param requests Array of OfficeRequest
 * @param dateFilter 'all' | 'week' | 'twoweeks' | 'month'
 * @returns Filtered array of OfficeRequest
 */
export function filterRequestsByDate(
  requests: OfficeRequest[],
  dateFilter: 'all' | 'week' | 'twoweeks' | 'month'
): OfficeRequest[] {
  if (dateFilter === 'all') return requests;
  const now = new Date();
  let cutoff: Date;
  if (dateFilter === 'week') {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (dateFilter === 'twoweeks') {
    cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  } else if (dateFilter === 'month') {
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    cutoff = new Date(0);
  }
  return requests.filter(r => new Date(r.created_at) >= cutoff);
}

/**
 * Sorts requests by date (newest first) or by upvotes (descending).
 * @param requests Array of OfficeRequest
 * @param upvoteCounts Map of requestId to upvote count
 * @param sortOrder 'date' | 'upvotes'
 * @returns Sorted array of OfficeRequest
 */
export function sortRequests(
  requests: OfficeRequest[],
  upvoteCounts: { [requestId: string]: number },
  sortOrder: 'date' | 'upvotes'
): OfficeRequest[] {
  if (sortOrder === 'upvotes') {
    return [...requests].sort((a, b) => {
      const upA = upvoteCounts[a.id] || 0;
      const upB = upvoteCounts[b.id] || 0;
      if (upB !== upA) return upB - upA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  } else {
    return [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
} 