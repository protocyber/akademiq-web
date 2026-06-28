"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api/client";
import { compressImageForUpload } from "@/lib/media/compress-image";
import { ME_QUERY_KEY } from "@/lib/query/queries/use-me";

// ===== API Input Types =====

export type RequestEmailChangeInput = {
  new_email: string;
};

export type VerifyEmailInput = {
  token: string;
};

export type ChangePasswordInput = {
  current_password: string;
  new_password: string;
};

export type UpdateProfileInput = {
  full_name?: string;
};

export type UploadAvatarInput = {
  file: File;
};

// ===== API Functions =====

/**
 * Request an email change. Sends verification email to new address.
 * Error codes: EMAIL_ALREADY_EXISTS, VALIDATION_ERROR
 */
export async function requestEmailChange(input: RequestEmailChangeInput): Promise<void> {
  await apiFetch<void>({
    service: "iam",
    path: "/api/v1/iam/me/email-change-request",
    method: "POST",
    authenticated: true,
    body: input,
  });
}

/**
 * Verify email change with token from email link.
 * This is a public endpoint (no auth required).
 * Error codes: INVALID_TOKEN, TOKEN_EXPIRED
 */
export async function verifyEmail(input: VerifyEmailInput): Promise<void> {
  await apiFetch<void>({
    service: "iam",
    path: "/api/v1/iam/me/email-verify",
    method: "POST",
    body: input,
  });
}

/**
 * Resend email verification to pending email address.
 * Error codes: NO_PENDING_EMAIL_CHANGE
 */
export async function resendEmailVerification(): Promise<void> {
  await apiFetch<void>({
    service: "iam",
    path: "/api/v1/iam/me/email-resend",
    method: "POST",
    authenticated: true,
  });
}

/**
 * Cancel pending email change.
 */
export async function cancelEmailChange(): Promise<void> {
  await apiFetch<void>({
    service: "iam",
    path: "/api/v1/iam/me/email-cancel",
    method: "POST",
    authenticated: true,
  });
}

/**
 * Change password for users with existing password.
 * Error codes: INVALID_CURRENT_PASSWORD, PASSWORD_NOT_SET, VALIDATION_ERROR
 */
export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await apiFetch<void>({
    service: "iam",
    path: "/api/v1/iam/me/password-change",
    method: "POST",
    authenticated: true,
    body: input,
  });
}

/**
 * Update profile fields (full_name, etc).
 */
export async function updateProfile(input: UpdateProfileInput): Promise<void> {
  await apiFetch<void>({
    service: "iam",
    path: "/api/v1/iam/me",
    method: "PATCH",
    authenticated: true,
    body: input,
  });
}

/**
 * Upload avatar image (multipart/form-data).
 * Error codes: FILE_TOO_LARGE, INVALID_FILE_TYPE
 */
export async function uploadAvatar(input: UploadAvatarInput): Promise<void> {
  const file = await compressImageForUpload(input.file);
  const formData = new FormData();
  formData.append("file", file);

  await apiFetch<void>({
    service: "iam",
    path: "/api/v1/iam/me/avatar",
    method: "POST",
    authenticated: true,
    body: formData,
  });
}

/**
 * Delete avatar image.
 */
export async function deleteAvatar(): Promise<void> {
  await apiFetch<void>({
    service: "iam",
    path: "/api/v1/iam/me/avatar",
    method: "DELETE",
    authenticated: true,
  });
}

// ===== Mutation Hooks =====

/**
 * Hook for requesting email change.
 * Invalidates /me query on success to update pending_email field.
 */
export function useRequestEmailChange() {
  const qc = useQueryClient();
  return useMutation<void, unknown, RequestEmailChangeInput>({
    mutationFn: requestEmailChange,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

/**
 * Hook for verifying email change.
 * Public endpoint - no auth required.
 * Note: This does NOT invalidate /me since user will be logged out after verification.
 */
export function useVerifyEmail() {
  return useMutation<void, unknown, VerifyEmailInput>({
    mutationFn: verifyEmail,
  });
}

/**
 * Hook for resending email verification.
 */
export function useResendEmailVerification() {
  return useMutation<void, unknown, void>({
    mutationFn: resendEmailVerification,
  });
}

/**
 * Hook for canceling email change.
 * Invalidates /me query on success to clear pending_email field.
 */
export function useCancelEmailChange() {
  const qc = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: cancelEmailChange,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

/**
 * Hook for changing password.
 * Note: This does NOT invalidate /me since user will be logged out after password change.
 */
export function useChangePassword() {
  return useMutation<void, unknown, ChangePasswordInput>({
    mutationFn: changePassword,
  });
}

/**
 * Hook for updating profile.
 * Invalidates /me query on success.
 */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<void, unknown, UpdateProfileInput>({
    mutationFn: updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

/**
 * Hook for uploading avatar.
 * Invalidates /me query on success to update avatar_url field.
 */
export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation<void, unknown, UploadAvatarInput>({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}

/**
 * Hook for deleting avatar.
 * Invalidates /me query on success to clear avatar_url field.
 */
export function useDeleteAvatar() {
  const qc = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: deleteAvatar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
    },
  });
}
