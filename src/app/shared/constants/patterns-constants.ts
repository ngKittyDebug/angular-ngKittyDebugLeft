export const PASSWORD_PATTERN = /^(?!\s)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,}(?<!\s)$/;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const USER_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;
