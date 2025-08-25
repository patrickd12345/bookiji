export class HttpError extends Error {
  status: number;
  code?: string;
  detail?: string;
  
  constructor(status: number, message: string, code?: string, detail?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export const jsonError = (status: number, message: string, code?: string, detail?: string) => {
  return new Response(JSON.stringify({ error: message, code, detail }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
};
