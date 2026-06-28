import { z } from "zod";

const indonesianErrorMap: z.ZodErrorMap = (issue, ctx) => {
  let message: string;

  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined") {
        message = "Wajib diisi";
      } else {
        message = `Tipe data tidak valid, diharapkan ${issue.expected} tetapi menerima ${issue.received}`;
      }
      break;
    case z.ZodIssueCode.invalid_literal:
      message = `Nilai harus berupa literal ${JSON.stringify(issue.expected)}`;
      break;
    case z.ZodIssueCode.unrecognized_keys:
      message = `Kunci tidak dikenali dalam objek: ${issue.keys.join(", ")}`;
      break;
    case z.ZodIssueCode.invalid_union:
      message = "Input tidak cocok dengan salah satu tipe yang diharapkan";
      break;
    case z.ZodIssueCode.invalid_union_discriminator:
      message = `Nilai diskriminator tidak valid. Diharapkan salah satu dari: ${issue.options.join(", ")}`;
      break;
    case z.ZodIssueCode.invalid_enum_value:
      message = `Nilai tidak valid. Diharapkan salah satu dari: ${issue.options.join(", ")}`;
      break;
    case z.ZodIssueCode.invalid_arguments:
      message = "Argumen fungsi tidak valid";
      break;
    case z.ZodIssueCode.invalid_return_type:
      message = "Tipe pengembalian fungsi tidak valid";
      break;
    case z.ZodIssueCode.invalid_date:
      message = "Format tanggal tidak valid";
      break;
    case z.ZodIssueCode.custom:
      message = issue.message || "Input tidak valid";
      break;
    case z.ZodIssueCode.invalid_intersection_types:
      message = "Hasil perpotongan tipe tidak valid";
      break;
    case z.ZodIssueCode.not_multiple_of:
      message = `Nilai harus kelipatan dari ${issue.multipleOf}`;
      break;
    case z.ZodIssueCode.not_finite:
      message = "Nilai harus berupa angka terbatas";
      break;
    case z.ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("startsWith" in issue.validation) {
          message = `Harus diawali dengan "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Harus diakhiri dengan "${issue.validation.endsWith}"`;
        } else {
          message = "Format string tidak valid";
        }
      } else {
        switch (issue.validation) {
          case "email":
            message = "Format email tidak valid";
            break;
          case "url":
            message = "Format URL tidak valid";
            break;
          case "uuid":
            message = "Format UUID tidak valid";
            break;
          case "cuid":
            message = "Format CUID tidak valid";
            break;
          case "regex":
            message = "Format tidak valid";
            break;
          case "datetime":
            message = "Format tanggal dan waktu tidak valid";
            break;
          default:
            message = "Format string tidak valid";
        }
      }
      break;
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") {
        if (issue.minimum === 1) {
          message = "Wajib diisi";
        } else {
          message = `Minimal ${issue.minimum} karakter`;
        }
      } else if (issue.type === "number") {
        message = `Minimal bernilai ${issue.minimum}`;
      } else if (issue.type === "array") {
        message = `Minimal ${issue.minimum} item`;
      } else {
        message = `Minimal ${issue.minimum}`;
      }
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") {
        message = `Maksimal ${issue.maximum} karakter`;
      } else if (issue.type === "number") {
        message = `Maksimal bernilai ${issue.maximum}`;
      } else if (issue.type === "array") {
        message = `Maksimal ${issue.maximum} item`;
      } else {
        message = `Maksimal ${issue.maximum}`;
      }
      break;
    default:
      message = ctx.defaultError;
  }

  return { message };
};

z.setErrorMap(indonesianErrorMap);
