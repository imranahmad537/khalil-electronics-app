// Supabase's API returns at most 1,000 rows per request (max_rows) and says
// nothing when it cuts a list short — so any query that can grow past that
// (receipts, installments, customers…) must page through with .range().
// Pass a function that builds the query for one page; give it a stable
// .order() so pages don't overlap.

type Page<T> = { data: T[] | null; error: { message: string } | null };

const PAGE = 1000;

export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Page<T>>): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) return { data: all, error };
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE) return { data: all, error: null };
  }
}
