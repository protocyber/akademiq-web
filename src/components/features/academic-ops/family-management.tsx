"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, X, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormLabelRequired, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/errors/messages";
import { familyProfileSchema, type FamilyProfileForm } from "@/lib/schemas/academic-ops";
import {
  useFamiliesTable,
  useStudentFamilyLinks,
  type FamilyProfile,
  type StudentFamilyLink,
} from "@/lib/query/queries/use-academic-ops";
import {
  useCreateFamilyProfile,
  useCreateFamilyLink,
  useDeleteFamilyLink,
} from "@/lib/query/mutations/use-academic-ops";

const RELATIONSHIP_LABELS: Record<string, string> = {
  father: "Ayah",
  mother: "Ibu",
  guardian: "Wali",
  sibling: "Saudara",
  grandparent: "Kakek/Nenek",
  other: "Lainnya",
};

export function FamilyManagementTab({ studentId }: { studentId: string }) {
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showLinkDialog, setShowLinkDialog] = React.useState(false);

  const familyLinksQuery = useStudentFamilyLinks(studentId);
  const createLink = useCreateFamilyLink(studentId);
  const unlinkFamily = useDeleteFamilyLink(studentId);

  const linkedFamilyIds = React.useMemo(
    () => new Set(familyLinksQuery.data?.map((link) => link.family_id) ?? []),
    [familyLinksQuery.data]
  );

  async function handleLinkFamily(familyId: string, relationshipType: string) {
    try {
      await createLink.mutateAsync({
        family_id: familyId,
        relationship_type: relationshipType as "ayah" | "ibu" | "wali" | "saudara" | "kakek" | "nenek" | "lainnya",
        studentId,
      });
      toast.success("Keluarga berhasil ditautkan");
      setShowLinkDialog(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal menautkan keluarga" }));
    }
  }

  async function handleUnlinkFamily(linkId: string) {
    try {
      await unlinkFamily.mutateAsync(linkId);
      toast.success("Keluarga berhasil diputuskan");
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal memutuskan keluarga" }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Linked Families Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Keluarga Terhubung</h3>
          <Button
            size="sm"
            onClick={() => setShowLinkDialog(true)}
            disabled={familyLinksQuery.isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Keluarga
          </Button>
        </div>

        {familyLinksQuery.isLoading ? (
          <div className="space-y-2">
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
            <div className="h-20 animate-pulse rounded-lg bg-muted" />
          </div>
        ) : familyLinksQuery.data && familyLinksQuery.data.length > 0 ? (
          <div className="space-y-3">
            {familyLinksQuery.data.map((link) => (
      <LinkedFamilyCard
        key={link.link_id}
        link={link}
        onUnlink={() => handleUnlinkFamily(link.link_id)}
        isUnlinking={unlinkFamily.isPending}
      />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada keluarga yang terhubung
            </p>
          </div>
        )}
      </div>

      {/* Create New Family Dialog */}
      <CreateFamilyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        studentId={studentId}
      />

      {/* Link Existing Family Dialog */}
      <LinkFamilyDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        studentId={studentId}
        linkedFamilyIds={linkedFamilyIds}
        onLink={handleLinkFamily}
      />
    </div>
  );
}

function LinkedFamilyCard({
  link,
  onUnlink,
  isUnlinking,
}: {
  link: StudentFamilyLink;
  onUnlink: () => void;
  isUnlinking: boolean;
}) {
  const family = link.family;
  if (!family) return null;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{family.full_name}</h4>
            <Badge variant="outline">
              {RELATIONSHIP_LABELS[link.relationship_type] ?? link.relationship_type}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground space-y-0.5">
            {family.phone_number && <p>Telepon: {family.phone_number}</p>}
            {family.email && <p>Email: {family.email}</p>}
            {family.address_line && <p>Alamat: {family.address_line}</p>}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onUnlink}
          disabled={isUnlinking}
          className="text-destructive hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CreateFamilyDialog({
  open,
  onOpenChange,
  studentId: _studentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
}) {
  const createFamily = useCreateFamilyProfile();
  const [duplicateWarning, setDuplicateWarning] = React.useState<FamilyProfile[] | null>(null);
  const [showWarning, setShowWarning] = React.useState(false);

  const form = useForm<FamilyProfileForm>({
    resolver: zodResolver(familyProfileSchema),
    defaultValues: {
      full_name: "",
      nik: "",
      phone_number: "",
      email: "",
      address_line: "",
      occupation: "",
      birth_date: "",
      birth_place: "",
      religion: "",
      nationality: "Indonesia",
      education_level: "",
      income_range: "",
      life_status: "",
      marital_status: "",
      user_id: "",
    },
  });

  async function onSubmit(data: FamilyProfileForm, forceCreate = false) {
    try {
      const result = await createFamily.mutateAsync(data);

      if (result.duplicate_warning && result.duplicate_warning.duplicates && result.duplicate_warning.duplicates.length > 0 && !forceCreate) {
        setDuplicateWarning(result.duplicate_warning.duplicates as unknown as FamilyProfile[]);
        setShowWarning(true);
        return;
      }

      toast.success("Keluarga berhasil dibuat");
      onOpenChange(false);
      form.reset();
      setDuplicateWarning(null);
      setShowWarning(false);
    } catch (err) {
      toast.error(getErrorMessage(err, { fallback: "Gagal membuat keluarga" }));
    }
  }

  function handleClose() {
    onOpenChange(false);
    form.reset();
    setDuplicateWarning(null);
    setShowWarning(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Keluarga Baru</DialogTitle>
          <DialogDescription>
            Tambahkan profil keluarga baru untuk siswa ini
          </DialogDescription>
        </DialogHeader>

        {showWarning && duplicateWarning && duplicateWarning.length > 0 && (
          <div className="rounded-lg border border-warning bg-warning/10 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <h4 className="font-medium text-warning">Keluarga dengan data serupa ditemukan</h4>
                <p className="text-sm text-muted-foreground">
                  Apakah Anda yakin ingin membuat keluarga baru? Atau pilih salah satu yang sudah ada:
                </p>
                <div className="space-y-2">
                  {duplicateWarning.map((family) => (
                    <div key={family.family_id} className="rounded border bg-background p-3">
                      <p className="font-medium">{family.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {family.phone_number && `Telepon: ${family.phone_number}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => onSubmit(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabelRequired>Nama Lengkap</FormLabelRequired>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nik"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIK</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomor Telepon</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address_line"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alamat</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pekerjaan</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Batal
              </Button>
              {showWarning ? (
                <Button
                  type="button"
                  onClick={() => onSubmit(form.getValues(), true)}
                  disabled={createFamily.isPending}
                >
                  {createFamily.isPending ? "Membuat..." : "Tetap Buat Baru"}
                </Button>
              ) : (
                <Button type="submit" disabled={createFamily.isPending}>
                  {createFamily.isPending ? "Membuat..." : "Buat Keluarga"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function LinkFamilyDialog({
  open,
  onOpenChange,
  studentId: _studentId,
  linkedFamilyIds,
  onLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  linkedFamilyIds: Set<string>;
  onLink: (familyId: string, relationshipType: string) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedFamily, setSelectedFamily] = React.useState<FamilyProfile | null>(null);
  const [relationshipType, setRelationshipType] = React.useState("");
  const [isLinking, setIsLinking] = React.useState(false);

  const familiesQuery = useFamiliesTable({
    page: 1,
    page_size: 20,
    search: searchQuery,
    sort: "name",
  });

  const availableFamilies = React.useMemo(
    () => (familiesQuery.data?.data ?? []).filter((f) => !linkedFamilyIds.has(f.family_id)),
    [familiesQuery.data, linkedFamilyIds]
  );

  async function handleLink() {
    if (!selectedFamily || !relationshipType) return;
    setIsLinking(true);
    try {
      await onLink(selectedFamily.family_id, relationshipType);
      setSearchQuery("");
      setSelectedFamily(null);
      setRelationshipType("");
    } finally {
      setIsLinking(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    setSearchQuery("");
    setSelectedFamily(null);
    setRelationshipType("");
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tautkan Keluarga</DialogTitle>
          <DialogDescription>
            Cari dan tautkan keluarga yang sudah ada ke siswa ini
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <SearchInput
            placeholder="Cari nama atau NIK..."
            value={searchQuery}
            onChange={setSearchQuery}
            debounce={350}
          />

          {familiesQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
              <div className="h-16 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : availableFamilies.length > 0 ? (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {availableFamilies.map((family) => (
                <div
                  key={family.family_id}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted ${
                    selectedFamily?.family_id === family.family_id ? "border-primary bg-primary/10" : ""
                  }`}
                  onClick={() => setSelectedFamily(family)}
                >
                  <div className="font-medium">{family.full_name}</div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {family.nik && <p>NIK: {family.nik}</p>}
                    {family.phone_number && <p>Telepon: {family.phone_number}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Tidak ada keluarga yang cocok" : "Belum ada keluarga terdaftar"}
              </p>
            </div>
          )}

          {selectedFamily && (
            <div className="space-y-3 border-t pt-4">
              <div>
                <label className="text-sm font-medium">Hubungan</label>
                <Select value={relationshipType} onValueChange={setRelationshipType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih hubungan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">Ayah</SelectItem>
                    <SelectItem value="mother">Ibu</SelectItem>
                    <SelectItem value="guardian">Wali</SelectItem>
                    <SelectItem value="sibling">Saudara</SelectItem>
                    <SelectItem value="grandparent">Kakek/Nenek</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Batal
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedFamily || !relationshipType || isLinking}
          >
            {isLinking ? "Menautkan..." : "Tautkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
