"use client";

import * as React from "react";

import { RESULT_LABEL } from "@/components/features/promotion/labels";
import { OverrideDialog, formatScore } from "@/components/features/promotion/override-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupBySourceHomeroom } from "@/lib/promotion/placement";
import type { PromotionDecision, PromotionResult } from "@/lib/query/queries/use-promotion";

type ResultFilter = "all" | PromotionResult;

export function DecisionsTab({
  runId = "",
  decisions,
  editable,
  homeroomNames,
}: {
  runId?: string;
  decisions: PromotionDecision[];
  editable: boolean;
  homeroomNames: ReadonlyMap<string, string>;
}) {
  const groups = React.useMemo(() => groupBySourceHomeroom(decisions), [decisions]);
  const [homeroomId, setHomeroomId] = React.useState<string | undefined>(undefined);
  const [resultFilter, setResultFilter] = React.useState<ResultFilter>("all");
  const [overriddenOnly, setOverriddenOnly] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<PromotionDecision | null>(null);

  const active = groups.find((g) => g.homeroom_id === homeroomId) ?? groups[0];
  const showTarget = decisions.some((d) => d.target_enrollment_id !== null);
  const needle = search.trim().toLowerCase();
  const rows = (active?.decisions ?? []).filter(
    (d) =>
      (resultFilter === "all" || d.result === resultFilter) &&
      (!overriddenOnly || d.overridden) &&
      (needle === "" ||
        (d.full_name ?? "").toLowerCase().includes(needle) ||
        (d.nis ?? "").toLowerCase().includes(needle)),
  );

  if (groups.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Belum ada keputusan.</p>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={active?.homeroom_id} onValueChange={setHomeroomId} variant="underline">
        <TabsList scrollable>
          {groups.map((g) => (
            <TabsTrigger key={g.homeroom_id} value={g.homeroom_id}>
              {g.homeroom_name} ({g.decisions.length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama atau NIS" aria-label="Cari siswa" className="sm:w-64" />
        <Select value={resultFilter} onValueChange={(v) => setResultFilter(v as ResultFilter)}>
          <SelectTrigger aria-label="Filter hasil" className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua hasil</SelectItem>
            <SelectItem value="promote">Naik</SelectItem>
            <SelectItem value="retain">Tinggal</SelectItem>
            <SelectItem value="graduate">Lulus</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Checkbox id="overridden-only" checked={overriddenOnly} onCheckedChange={(c) => setOverriddenOnly(c === true)} />
          <Label htmlFor="overridden-only">Hanya override</Label>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>NIS</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead className="text-right">Rata-rata</TableHead>
            <TableHead className="text-right">Di bawah KKM</TableHead>
            <TableHead>Rekomendasi</TableHead>
            <TableHead>Hasil</TableHead>
            <TableHead>Alasan</TableHead>
            {showTarget ? <TableHead>Kelas tujuan</TableHead> : null}
            {editable ? <TableHead /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d) => (
            <TableRow key={d.decision_id}>
              <TableCell className="tabular-nums">{d.nis ?? "—"}</TableCell>
              <TableCell className="font-medium">{d.full_name ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{formatScore(d.computed_metrics.average)}</TableCell>
              <TableCell className="text-right tabular-nums">{d.computed_metrics.subjects_below_kkm}</TableCell>
              <TableCell>{RESULT_LABEL[d.recommended]}</TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  {RESULT_LABEL[d.result]}
                  {d.overridden ? <Badge variant="outline">Override</Badge> : null}
                </span>
              </TableCell>
              <TableCell className="max-w-xs text-sm text-muted-foreground">{d.reason ?? ""}</TableCell>
              {showTarget ? (
                <TableCell>{d.target_homeroom_id ? homeroomNames.get(d.target_homeroom_id) ?? "—" : "—"}</TableCell>
              ) : null}
              {editable ? (
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" aria-label={`Ubah ${d.full_name ?? d.nis ?? ""}`} onClick={() => setEditing(d)}>
                    Ubah
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 ? <p className="text-center text-sm text-muted-foreground">Tidak ada siswa yang cocok.</p> : null}
      <OverrideDialog
        runId={runId}
        decision={editing}
        open={editing !== null}
        onOpenChange={(open) => (!open ? setEditing(null) : undefined)}
      />
    </div>
  );
}
