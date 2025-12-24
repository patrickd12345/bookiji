import { SupabaseClient } from '@supabase/supabase-js';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationConfig {
  maxLimit: number;
  defaultLimit: number;
  defaultSortBy?: string;
  defaultSortOrder: 'asc' | 'desc';
  allowedSortFields?: string[];
}

const DEFAULT_CONFIG: PaginationConfig = {
  maxLimit: 100,
  defaultLimit: 20,
  defaultSortOrder: 'desc',
  allowedSortFields: ['created_at', 'updated_at', 'name', 'id']
};

export class PaginationHelper {
  private config: PaginationConfig;

  constructor(config: Partial<PaginationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate and normalize pagination parameters
   */
  public validateParams(params: PaginationParams): Required<PaginationParams> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(
      this.config.maxLimit,
      Math.max(1, params.limit || this.config.defaultLimit)
    );
    
    let sortBy = params.sortBy || this.config.defaultSortBy || 'created_at';
    
    // Validate sort field if allowedSortFields is specified
    if (this.config.allowedSortFields && !this.config.allowedSortFields.includes(sortBy)) {
      sortBy = this.config.allowedSortFields[0] || 'created_at';
    }
    
    const sortOrder = params.sortOrder || this.config.defaultSortOrder;

    return { page, limit, sortBy, sortOrder };
  }

  /**
   * Calculate offset for database queries
   */
  public calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Build pagination metadata
   */
  public buildPaginationMeta(
    page: number,
    limit: number,
    total: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): PaginationResult<any>['pagination'] {
    const totalPages = Math.ceil(total / limit);
    
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * Apply pagination to a Supabase query
   */
  public applyToQuery<_T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any, // Supabase query builder
    params: PaginationParams,
    options: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      countQuery?: any; // Separate query for counting (optional)
      selectCount?: boolean; // Whether to include count in the main query
    } = {}
  ) {
    const { page, limit, sortBy, sortOrder } = this.validateParams(params);
    const offset = this.calculateOffset(page, limit);

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // If we need count, add it to the query
    if (options.selectCount !== false) {
      query = query.select('*', { count: 'exact' });
    }

    return {
      query,
      paginationParams: { page, limit, sortBy, sortOrder },
      offset
    };
  }

  /**
   * Execute a paginated query and return formatted result
   */
  public async executePaginatedQuery<T>(
    supabase: SupabaseClient,
    tableName: string,
    params: PaginationParams,
    options: {
      select?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters?: (query: any) => any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      countFilters?: (query: any) => any;
    } = {}
  ): Promise<PaginationResult<T>> {
    const { page, limit, sortBy, sortOrder } = this.validateParams(params);
    const offset = this.calculateOffset(page, limit);

    // Build base query
    let query = supabase
      .from(tableName)
      .select(options.select || '*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (options.filters) {
      query = options.filters(query);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Pagination query failed: ${error.message}`);
    }

    const total = count || 0;
    const pagination = this.buildPaginationMeta(page, limit, total);

    return {
      data: (data as T[]) || [],
      pagination
    };
  }

  /**
   * Create pagination links/URLs
   */
  public createPaginationUrls(
    baseUrl: string,
    currentParams: Required<PaginationParams>,
    total: number
  ): {
    first: string;
    prev: string | null;
    next: string | null;
    last: string;
  } {
    const { page, limit, sortBy, sortOrder } = currentParams;
    const totalPages = Math.ceil(total / limit);

    const createUrl = (targetPage: number) => {
      const url = new URL(baseUrl);
      url.searchParams.set('page', targetPage.toString());
      url.searchParams.set('limit', limit.toString());
      url.searchParams.set('sortBy', sortBy);
      url.searchParams.set('sortOrder', sortOrder);
      return url.toString();
    };

    return {
      first: createUrl(1),
      prev: page > 1 ? createUrl(page - 1) : null,
      next: page < totalPages ? createUrl(page + 1) : null,
      last: createUrl(totalPages)
    };
  }
}

// Pre-configured pagination helpers for common use cases
export const defaultPagination = new PaginationHelper();

export const strictPagination = new PaginationHelper({
  maxLimit: 50,
  defaultLimit: 10,
  allowedSortFields: ['created_at', 'updated_at']
});

export const publicPagination = new PaginationHelper({
  maxLimit: 20,
  defaultLimit: 10,
  allowedSortFields: ['created_at', 'name', 'rating']
});

// Utility function to extract pagination params from URL search params
export function extractPaginationParams(searchParams: URLSearchParams): PaginationParams {
  return {
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined
  };
}

// Utility function for cursor-based pagination (for very large datasets)
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  prevCursor?: string;
  hasNext: boolean;
  hasPrev: boolean;
}

export class CursorPagination {
  public static async execute<T extends { id: string; created_at: string }>(
    supabase: SupabaseClient,
    tableName: string,
    params: CursorPaginationParams,
    options: {
      select?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filters?: (query: any) => any;
      cursorField?: string;
    } = {}
  ): Promise<CursorPaginationResult<T>> {
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const direction = params.direction || 'forward';
    const cursorField = options.cursorField || 'created_at';

    let query = supabase
      .from(tableName)
      .select(options.select || '*')
      .order(cursorField, { ascending: direction === 'forward' })
      .limit(limit + 1); // Fetch one extra to check if there's more

    // Apply cursor filtering
    if (params.cursor) {
      if (direction === 'forward') {
        query = query.gt(cursorField, params.cursor);
      } else {
        query = query.lt(cursorField, params.cursor);
      }
    }

    // Apply additional filters
    if (options.filters) {
      query = options.filters(query);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Cursor pagination query failed: ${error.message}`);
    }

    const items = (data as unknown as T[]) || [];
    const hasMore = items.length > limit;
    
    if (hasMore) {
      items.pop(); // Remove the extra item
    }

    const nextCursor = hasMore && items.length > 0 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (items[items.length - 1] as any)[cursorField] as string
      : undefined;
      
    const prevCursor = items.length > 0 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (items[0] as any)[cursorField] as string
      : undefined;

    return {
      data: items,
      nextCursor,
      prevCursor,
      hasNext: direction === 'forward' ? hasMore : !!params.cursor,
      hasPrev: direction === 'backward' ? hasMore : !!params.cursor
    };
  }
}
