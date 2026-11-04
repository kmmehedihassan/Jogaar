export class ApiError extends Error {
  constructor(message, field = null, status = 400) {
    super(message);
    this.name = "ApiError";
    this.field = field;
    this.status = status;
  }
}
