import pkg from "exceljs";
const { Workbook } = pkg;
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../public/templates");

const STUDENT_COLUMNS = [
  { field: "nis",            label: "NIS",                   required: true,  format: "text",                          example: "1234567" },
  { field: "nisn",           label: "NISN",                  required: false, format: "text",                          example: "9876543210" },
  { field: "nik",            label: "NIK",                   required: false, format: "text",                          example: "3171234567890001" },
  { field: "full_name",      label: "Nama Lengkap",          required: true,  format: "text",                          example: "Andi Saputra" },
  { field: "gender",         label: "Jenis Kelamin",         required: true,  format: "male/female/laki-laki/perempuan", example: "laki-laki" },
  { field: "birth_date",     label: "Tanggal Lahir",         required: true,  format: "YYYY-MM-DD",                    example: "2010-05-15" },
  { field: "birth_place",    label: "Tempat Lahir",          required: false, format: "text",                          example: "Jakarta" },
  { field: "address_line",   label: "Alamat",                required: false, format: "text",                          example: "Jl. Merdeka No. 10" },
  { field: "phone_number",   label: "Nomor Telepon",         required: false, format: "text",                          example: "081234567890" },
  { field: "religion",       label: "Agama",                 required: false, format: "text",                          example: "Islam" },
  { field: "nationality",    label: "Kewarganegaraan",       required: false, format: "text",                          example: "WNI" },
  { field: "child_order",    label: "Anak Ke",               required: false, format: "integer",                       example: "1" },
  { field: "sibling_count",  label: "Jumlah Saudara",        required: false, format: "integer",                       example: "2" },
  { field: "entry_date",     label: "Tanggal Masuk",         required: false, format: "YYYY-MM-DD",                    example: "2023-07-17" },
  { field: "origin_school",  label: "Asal Sekolah",          required: false, format: "text",                          example: "SDN 01 Jakarta" },
];

const TEACHER_COLUMNS = [
  { field: "nip",                  label: "NIP",                    required: true,  format: "text",                          example: "199001012020011001" },
  { field: "nik",                  label: "NIK",                    required: false, format: "text",                          example: "3171234567890001" },
  { field: "full_name",            label: "Nama Lengkap",           required: true,  format: "text",                          example: "Budi Santoso" },
  { field: "education_level",      label: "Tingkat Pendidikan",     required: false, format: "text",                          example: "S1" },
  { field: "gender",               label: "Jenis Kelamin",          required: false, format: "male/female/laki-laki/perempuan", example: "laki-laki" },
  { field: "birth_date",           label: "Tanggal Lahir",          required: false, format: "YYYY-MM-DD",                    example: "1990-01-01" },
  { field: "birth_place",          label: "Tempat Lahir",           required: false, format: "text",                          example: "Surabaya" },
  { field: "address_line",         label: "Alamat",                 required: false, format: "text",                          example: "Jl. Pahlawan No. 5" },
  { field: "phone_number",         label: "Nomor Telepon",          required: false, format: "text",                          example: "082345678901" },
  { field: "email",                label: "Email",                  required: false, format: "text",                          example: "budi@sekolah.sch.id" },
  { field: "employment_status",    label: "Status Kepegawaian",     required: false, format: "text",                          example: "PNS" },
  { field: "role_position",        label: "Jabatan",                required: false, format: "text",                          example: "Guru Kelas" },
  { field: "start_date",           label: "Tanggal Mulai",          required: false, format: "YYYY-MM-DD",                    example: "2020-01-01" },
  { field: "end_date",             label: "Tanggal Selesai",        required: false, format: "YYYY-MM-DD",                    example: "" },
  { field: "primary_subject_area", label: "Mata Pelajaran Utama",   required: false, format: "text",                          example: "Matematika" },
  { field: "nuptk",               label: "NUPTK",                  required: false, format: "text",                          example: "1234567890123456" },
  { field: "certification_number", label: "Nomor Sertifikasi",      required: false, format: "text",                          example: "" },
];

async function generate(filename, columns) {
  const wb = new Workbook();
  wb.creator = "AcademiQ";
  wb.created = new Date();

  const dataSheet = wb.addWorksheet("Data");
  dataSheet.addRow(columns.map((c) => c.field));
  const headerRow = dataSheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9E1F2" },
  };
  columns.forEach((_, i) => {
    dataSheet.getColumn(i + 1).width = 22;
  });

  const guideSheet = wb.addWorksheet("Petunjuk");
  guideSheet.addRow(["Kolom (field)", "Label Indonesia", "Wajib?", "Format / Nilai", "Contoh"]);
  const guideHeader = guideSheet.getRow(1);
  guideHeader.font = { bold: true };
  guideHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF2CC" },
  };
  guideSheet.getColumn(1).width = 26;
  guideSheet.getColumn(2).width = 26;
  guideSheet.getColumn(3).width = 10;
  guideSheet.getColumn(4).width = 36;
  guideSheet.getColumn(5).width = 26;

  for (const col of columns) {
    guideSheet.addRow([col.field, col.label, col.required ? "Ya" : "Tidak", col.format, col.example]);
  }

  const out = path.join(OUT_DIR, filename);
  await wb.xlsx.writeFile(out);
  console.log(`Generated: ${out}`);
}

await generate("students-template.xlsx", STUDENT_COLUMNS);
await generate("teachers-template.xlsx", TEACHER_COLUMNS);
