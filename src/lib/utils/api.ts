/**
 * API utility functions for standardized request/response handling
 */

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type ApiError = {
  message: string;
  code?: string;
  status?: number;
};

/**
 * Standardized API fetch wrapper with error handling
 */
export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(message: string, code?: string, status = 500): Response {
  return Response.json(
    {
      success: false,
      error: message,
      code,
    },
    { status }
  );
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(data: T, status = 200): Response {
  return Response.json(
    {
      success: true,
      data,
    },
    { status }
  );
}


