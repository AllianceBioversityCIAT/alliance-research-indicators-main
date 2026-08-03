export interface ErrorDetailLike {
  data?: { message_error?: string; result_official_code?: string; platform_code?: string };
  message_error?: string;
  description?: string;
  errors?: string | Record<string, unknown>;
  detail?: string;
}


